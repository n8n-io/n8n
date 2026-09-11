// Budget exhaustion is returned as a result, never thrown. JIT stays off
// (PCRE2_SUPPORT_JIT=OFF): the budget options only apply to the interpreted path.

#pragma once

#include <chrono>
#include <cstdint>
#include <string>
#include <vector>

// 16-bit code units so PCRE2 offsets are already JS string (UTF-16) indices.
#define PCRE2_CODE_UNIT_WIDTH 16
#include <pcre2.h>

enum class MatchStatus {
    Match = 0,
    NoMatch = 1,
    MatchLimitExceeded = 2,
    DepthLimitExceeded = 3,
    HeapLimitExceeded = 4,
    CompileError = 5,
    OtherError = 6,
    // match_limit/depth_limit count backtrack steps, not time: an unanchored lazy
    // quantifier can stay well under those counters while still costing O(subject
    // length) wall-clock per scan position. This is the primary defense against that
    // shape, checked via a PCRE2_AUTO_CALLOUT callback -- the JS-side operation timeout
    // (budget.ts) only fires between matches and can't interrupt one already in flight.
    WallClockExceeded = 7,
};

struct MatchResult {
    MatchStatus status;
    std::vector<std::u16string> groups;
    // Parallel to `groups`: unset (PCRE2_UNSET) vs matched-empty, both otherwise look the same.
    std::vector<int> groupParticipated;
    int errorCode;
    std::u16string errorMessage;
    long matchStart;
    long matchEnd;
};

struct CompileResult {
    bool ok;
    int errorCode;
    std::u16string errorMessage;
    size_t errorOffset;
};

struct NamedGroup {
    std::u16string name;
    int index;
};

// Native compile-time flag chars, as the JS layer's single source of truth for which
// characters PCRE2 itself understands (see kNativeFlagTable in pcre2_wrapper.cpp).
std::u16string nativeFlagChars();

class Pcre2Wrapper {
public:
    Pcre2Wrapper(const std::u16string& pattern,
                const std::string& flags,
                uint32_t matchLimit,
                uint32_t depthLimit,
                size_t heapLimitKb,
                uint32_t wallClockLimitMs,
                uint32_t extraOptions,
                uint32_t compileExtraOptions,
                uint32_t newlineConvention);
    ~Pcre2Wrapper();

    CompileResult compileStatus() const;

    std::vector<NamedGroup> namedGroups() const;

    // Marshals `subject` into wasm memory once; matchAt() reuses it for every subsequent
    // call, so a matchAll/replace/split loop over the same subject pays that cost once,
    // not once per match (embind previously re-copied the whole string on every call).
    void setSubject(const std::u16string& subject);

    MatchResult matchAt(size_t startOffset, bool anchored) const;

    // Called from the free-function callout registered on matchContext_ (not part of the
    // public/embind-facing API). Returns true once wallClockLimitMs_ has elapsed since the
    // current matchAt() call started.
    bool checkDeadline() const;

private:
    pcre2_code* code_;
    pcre2_match_context* matchContext_ = nullptr;
    // Created once at compile time (fixed by the pattern's own capture count, not by any
    // particular subject), instead of once per match.
    pcre2_match_data* matchData_ = nullptr;
    std::u16string subject_;
    bool utfEnabled_ = false;
    uint32_t wallClockLimitMs_ = 0;
    // Deadline for the callout registered on matchContext_, reset at the top of every
    // matchAt() call; the callout only rereads the clock every kCalloutCheckInterval
    // invocations (see .cpp) to keep its own overhead off the hot path.
    mutable std::chrono::steady_clock::time_point deadline_;
    mutable uint32_t calloutCounter_ = 0;
    // Set once matchAt() has validated the current subject_ (its first call after
    // setSubject()); PCRE2_NO_UTF_CHECK is then safe on later calls against the same
    // subject, since every matchAt() loop starts at offset 0, so that first call always
    // validates the whole string, not just a prefix of it.
    mutable bool subjectValidated_ = false;
    bool compileOk_;
    int compileErrorCode_;
    size_t compileErrorOffset_;
    // PCRE2_INFO_CAPTURECOUNT: pads trailing unset groups instead of dropping them.
    uint32_t captureCount_ = 0;
    // Caps code units copied per match; the match budgets don't bound result size.
    size_t copyLimit_ = 0;
};
