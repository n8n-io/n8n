// match_limit/depth_limit/heap_limit are returned as a *result*, never a thrown
// exception. JIT is disabled (PCRE2_SUPPORT_JIT=OFF): the budget options only
// apply to the interpreted path.

#pragma once

#include <string>
#include <vector>

#define PCRE2_CODE_UNIT_WIDTH 8
#include <pcre2.h>

enum class MatchStatus {
    Match = 0,
    NoMatch = 1,
    MatchLimitExceeded = 2,
    DepthLimitExceeded = 3,
    HeapLimitExceeded = 4,
    CompileError = 5,
    OtherError = 6,
};

struct MatchResult {
    MatchStatus status;
    std::vector<std::string> groups; // groups[0] = whole match
    // Parallel to `groups`: distinguishes an unset (PCRE2_UNSET) group from one that
    // matched empty text, since both otherwise produce an empty groups[i] entry.
    std::vector<int> groupParticipated;
    int errorCode;
    std::string errorMessage;
    long matchStart;
    long matchEnd;
};

struct CompileResult {
    bool ok;
    int errorCode;
    std::string errorMessage;
    size_t errorOffset;
};

struct NamedGroup {
    std::string name;
    int index;
};

class Pcre2Wrapper {
public:
    Pcre2Wrapper(const std::string& pattern,
                const std::string& flags,
                uint32_t matchLimit,
                uint32_t depthLimit,
                size_t heapLimitKb,
                uint32_t extraOptions,
                uint32_t compileExtraOptions,
                uint32_t newlineConvention);
    ~Pcre2Wrapper();

    CompileResult compileStatus() const;

    // Resolved once per compiled pattern: PCRE2's name table never changes across matches.
    std::vector<NamedGroup> namedGroups() const;

    MatchResult match(const std::string& subject, size_t startOffset, bool anchored) const;

private:
    pcre2_code* code_;
    pcre2_match_context* matchContext_ = nullptr;
    bool compileOk_;
    int compileErrorCode_;
    size_t compileErrorOffset_;
};
