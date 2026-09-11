#include "pcre2_wrapper.h"

namespace {

// PCRE2_UCHAR16 buffers map 1:1 onto std::u16string, which embind hands to JS as a string.
std::u16string errorMessageFor(int errorCode) {
    PCRE2_UCHAR buf[256];
    int length = pcre2_get_error_message(errorCode, buf, sizeof(buf) / sizeof(buf[0]));
    if (length <= 0) return std::u16string();
    return std::u16string(reinterpret_cast<const char16_t*>(buf), static_cast<size_t>(length));
}

struct NativeFlagEntry {
    char16_t ch;
    uint32_t option;
};

// The only place mapping a flag character to a PCRE2 compile option. nativeFlagChars()
// exposes the char set from this same table so the JS layer never hand-duplicates it.
constexpr NativeFlagEntry kNativeFlagTable[] = {
    {u'i', PCRE2_CASELESS},
    {u'm', PCRE2_MULTILINE},
    {u's', PCRE2_DOTALL},
    {u'x', PCRE2_EXTENDED},
    {u'u', PCRE2_UTF},
};

uint32_t optionsForFlags(const std::string& flags) {
    uint32_t options = 0;
    for (char f : flags) {
        for (const auto& entry : kNativeFlagTable) {
            if (entry.ch == static_cast<char16_t>(f)) {
                options |= entry.option;
                break;
            }
        }
    }
    return options;
}

// Rereading the clock on every one of PCRE2_AUTO_CALLOUT's per-item invocations would
// itself become the hot path; this amortizes that cost while staying well under any
// wallClockLimitMs_ worth setting (single-digit-ms or higher).
constexpr uint32_t kCalloutCheckInterval = 256;

// PCRE2_ERROR_CALLOUT is reserved by PCRE2 for exactly this: a callout's own negative
// return value, never produced by PCRE2 itself, so it can't be confused with a real
// match error once it comes back out of pcre2_match().
int deadlineCallout(pcre2_callout_block* /*block*/, void* data) {
    auto* wrapper = static_cast<Pcre2Wrapper*>(data);
    return wrapper->checkDeadline() ? PCRE2_ERROR_CALLOUT : 0;
}

} // namespace

std::u16string nativeFlagChars() {
    std::u16string chars;
    for (const auto& entry : kNativeFlagTable) chars.push_back(entry.ch);
    return chars;
}

Pcre2Wrapper::Pcre2Wrapper(const std::u16string& pattern,
                         const std::string& flags,
                         uint32_t matchLimit,
                         uint32_t depthLimit,
                         size_t heapLimitKb,
                         uint32_t wallClockLimitMs,
                         uint32_t extraOptions,
                         uint32_t compileExtraOptions,
                         uint32_t newlineConvention)
    : code_(nullptr), compileOk_(false), compileErrorCode_(0), compileErrorOffset_(0)
{
    wallClockLimitMs_ = wallClockLimitMs;

    // PCRE2_UTF opt-in matches JS's `u` flag: off, each UTF-16 code unit is one
    // character (including lone surrogates); on, a surrogate pair is one code point.
    // PCRE2_AUTO_CALLOUT inserts a callout before every item so checkDeadline() gets
    // called regardless of the pattern's own content -- match_limit/depth_limit alone
    // don't bound wall-clock (see WallClockExceeded).
    uint32_t options = extraOptions | optionsForFlags(flags) | PCRE2_AUTO_CALLOUT;
    utfEnabled_ = (options & PCRE2_UTF) != 0;

    pcre2_compile_context* compileContext = pcre2_compile_context_create(nullptr);
    if (compileContext == nullptr) {
        compileErrorCode_ = PCRE2_ERROR_HEAPLIMIT;
        return;
    }
    if (compileExtraOptions != 0) {
        pcre2_set_compile_extra_options(compileContext, compileExtraOptions);
    }
    if (newlineConvention != 0) {
        pcre2_set_newline(compileContext, newlineConvention);
    }

    int errorCode = 0;
    PCRE2_SIZE errorOffset = 0;
    code_ = pcre2_compile(
        reinterpret_cast<PCRE2_SPTR>(pattern.c_str()), pattern.size(),
        options, &errorCode, &errorOffset, compileContext);

    pcre2_compile_context_free(compileContext);

    if (code_ == nullptr) {
        compileOk_ = false;
        compileErrorCode_ = errorCode;
        compileErrorOffset_ = errorOffset;
        return;
    }

    matchContext_ = pcre2_match_context_create(nullptr);
    if (matchContext_ == nullptr) {
        // Null match context: pcre2_match() would fall back to its far looser built-in limits.
        pcre2_code_free(code_);
        code_ = nullptr;
        compileErrorCode_ = PCRE2_ERROR_HEAPLIMIT;
        return;
    }
    pcre2_set_match_limit(matchContext_, matchLimit);
    pcre2_set_depth_limit(matchContext_, depthLimit);
    pcre2_set_heap_limit(matchContext_, static_cast<uint32_t>(heapLimitKb));
    if (wallClockLimitMs_ != 0) {
        pcre2_set_callout(matchContext_, deadlineCallout, this);
    }

    pcre2_pattern_info(code_, PCRE2_INFO_CAPTURECOUNT, &captureCount_);
    copyLimit_ = heapLimitKb * 1024;

    // Sized once from the pattern's own arity, then reused for every match -- deterministic,
    // unlike allocating it fresh (and possibly failing) mid-operation on every single call.
    matchData_ = pcre2_match_data_create_from_pattern(code_, nullptr);
    if (matchData_ == nullptr) {
        pcre2_match_context_free(matchContext_);
        matchContext_ = nullptr;
        pcre2_code_free(code_);
        code_ = nullptr;
        compileErrorCode_ = PCRE2_ERROR_HEAPLIMIT;
        return;
    }

    compileOk_ = true;
}

Pcre2Wrapper::~Pcre2Wrapper() {
    if (matchData_) pcre2_match_data_free(matchData_);
    if (matchContext_) pcre2_match_context_free(matchContext_);
    if (code_) pcre2_code_free(code_);
}

bool Pcre2Wrapper::checkDeadline() const {
    if (++calloutCounter_ < kCalloutCheckInterval) return false;
    calloutCounter_ = 0;
    return std::chrono::steady_clock::now() >= deadline_;
}

void Pcre2Wrapper::setSubject(const std::u16string& subject) {
    subject_ = subject;
    subjectValidated_ = false;
}

CompileResult Pcre2Wrapper::compileStatus() const {
    CompileResult r;
    r.ok = compileOk_;
    r.errorCode = compileErrorCode_;
    r.errorOffset = compileErrorOffset_;
    if (!compileOk_) {
        r.errorMessage = errorMessageFor(compileErrorCode_);
    }
    return r;
}

std::vector<NamedGroup> Pcre2Wrapper::namedGroups() const {
    std::vector<NamedGroup> result;
    if (!compileOk_) return result;

    uint32_t nameCount = 0;
    uint32_t nameEntrySize = 0;
    PCRE2_SPTR nameTable = nullptr;
    pcre2_pattern_info(code_, PCRE2_INFO_NAMECOUNT, &nameCount);
    pcre2_pattern_info(code_, PCRE2_INFO_NAMEENTRYSIZE, &nameEntrySize);
    pcre2_pattern_info(code_, PCRE2_INFO_NAMETABLE, &nameTable);

    // Entry layout (pcre2api(3)): one code unit group index, then zero-terminated name.
    PCRE2_SPTR entry = nameTable;
    for (uint32_t i = 0; i < nameCount; i++) {
        int index = static_cast<int>(entry[0]);
        std::u16string name(reinterpret_cast<const char16_t*>(entry + 1));
        result.push_back({name, index});
        entry += nameEntrySize;
    }
    return result;
}

MatchResult Pcre2Wrapper::matchAt(size_t startOffset, bool anchored) const {
    MatchResult result;
    result.errorCode = 0;
    result.matchStart = -1;
    result.matchEnd = -1;

    if (!compileOk_) {
        result.status = MatchStatus::CompileError;
        result.errorCode = compileErrorCode_;
        return result;
    }

    if (wallClockLimitMs_ != 0) {
        deadline_ = std::chrono::steady_clock::now() + std::chrono::milliseconds(wallClockLimitMs_);
        calloutCounter_ = 0;
    }

    // Emulates JS's sticky (`y`) flag: forces the match to start exactly at startOffset.
    uint32_t runtimeOptions = anchored ? PCRE2_ANCHORED : 0;
    // A matchAt() loop always starts its first call at offset 0, which validates the whole
    // subject; skip PCRE2's per-call UTF re-validation on every subsequent call in that same
    // loop (see pcre2api(3) PCRE2_NO_UTF_CHECK -- exactly the "repeated calls on one subject"
    // case it exists for), instead of paying an O(subject length) re-check on every match.
    if (utfEnabled_ && subjectValidated_) runtimeOptions |= PCRE2_NO_UTF_CHECK;

    int rc = pcre2_match(
        code_,
        reinterpret_cast<PCRE2_SPTR>(subject_.c_str()), subject_.size(),
        startOffset, runtimeOptions, matchData_, matchContext_);
    subjectValidated_ = true;

    if (rc == PCRE2_ERROR_NOMATCH) {
        result.status = MatchStatus::NoMatch;
    } else if (rc == PCRE2_ERROR_MATCHLIMIT) {
        result.status = MatchStatus::MatchLimitExceeded;
        result.errorCode = rc;
    } else if (rc == PCRE2_ERROR_DEPTHLIMIT) {
        result.status = MatchStatus::DepthLimitExceeded;
        result.errorCode = rc;
    } else if (rc == PCRE2_ERROR_HEAPLIMIT) {
        result.status = MatchStatus::HeapLimitExceeded;
        result.errorCode = rc;
    } else if (rc == PCRE2_ERROR_CALLOUT) {
        result.status = MatchStatus::WallClockExceeded;
        result.errorCode = rc;
    } else if (rc < 0) {
        result.status = MatchStatus::OtherError;
        result.errorCode = rc;
        result.errorMessage = errorMessageFor(rc);
    } else {
        result.status = MatchStatus::Match;
        PCRE2_SIZE* ovector = pcre2_get_ovector_pointer(matchData_);
        // rc is the highest captured pair + 1, so pad to the pattern's real arity
        // or a trailing never-participated group would be dropped, not just unset.
        uint32_t covered = static_cast<uint32_t>(rc);
        uint32_t total = captureCount_ + 1;
        if (covered > total) total = covered;
        result.matchStart = static_cast<long>(ovector[0]);
        result.matchEnd = static_cast<long>(ovector[1]);
        size_t copied = 0;
        for (uint32_t i = 0; i < total; i++) {
            PCRE2_SIZE start = i < covered ? ovector[2 * i] : PCRE2_UNSET;
            PCRE2_SIZE end = i < covered ? ovector[2 * i + 1] : PCRE2_UNSET;
            if (start == PCRE2_UNSET || end == PCRE2_UNSET) {
                result.groups.push_back(std::u16string());
                result.groupParticipated.push_back(0);
            } else {
                copied += end - start;
                if (copyLimit_ != 0 && copied > copyLimit_) {
                    result.groups.clear();
                    result.groupParticipated.clear();
                    result.matchStart = -1;
                    result.matchEnd = -1;
                    result.status = MatchStatus::HeapLimitExceeded;
                    result.errorCode = PCRE2_ERROR_HEAPLIMIT;
                    break;
                }
                result.groups.push_back(subject_.substr(start, end - start));
                result.groupParticipated.push_back(1);
            }
        }
    }

    return result;
}
