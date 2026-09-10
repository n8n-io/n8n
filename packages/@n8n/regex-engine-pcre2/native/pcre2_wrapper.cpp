#include "pcre2_wrapper.h"

Pcre2Wrapper::Pcre2Wrapper(const std::string& pattern,
                         const std::string& flags,
                         uint32_t matchLimit,
                         uint32_t depthLimit,
                         size_t heapLimitKb,
                         uint32_t extraOptions,
                         uint32_t compileExtraOptions,
                         uint32_t newlineConvention)
    : code_(nullptr), compileOk_(false), compileErrorCode_(0), compileErrorOffset_(0)
{
    // PCRE2_UTF is always on: the subject is always UTF-8 encoded before reaching PCRE2.
    uint32_t options = PCRE2_UTF | extraOptions;
    for (char f : flags) {
        switch (f) {
            case 'i': options |= PCRE2_CASELESS; break;
            case 'm': options |= PCRE2_MULTILINE; break;
            case 's': options |= PCRE2_DOTALL; break;
            case 'x': options |= PCRE2_EXTENDED; break;
            default: break;
        }
    }

    pcre2_compile_context* compileContext = pcre2_compile_context_create(nullptr);
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
    compileOk_ = true;

    matchContext_ = pcre2_match_context_create(nullptr);
    pcre2_set_match_limit(matchContext_, matchLimit);
    pcre2_set_depth_limit(matchContext_, depthLimit);
    pcre2_set_heap_limit(matchContext_, static_cast<uint32_t>(heapLimitKb));
}

Pcre2Wrapper::~Pcre2Wrapper() {
    if (matchContext_) pcre2_match_context_free(matchContext_);
    if (code_) pcre2_code_free(code_);
}

CompileResult Pcre2Wrapper::compileStatus() const {
    CompileResult r;
    r.ok = compileOk_;
    r.errorCode = compileErrorCode_;
    r.errorOffset = compileErrorOffset_;
    if (!compileOk_) {
        PCRE2_UCHAR buf[256];
        pcre2_get_error_message(compileErrorCode_, buf, sizeof(buf));
        r.errorMessage = std::string(reinterpret_cast<char*>(buf));
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

    // Each entry: a 2-byte big-endian group index, then the null-terminated name (pcre2api(3)).
    PCRE2_SPTR entry = nameTable;
    for (uint32_t i = 0; i < nameCount; i++) {
        int index = (entry[0] << 8) | entry[1];
        std::string name(reinterpret_cast<const char*>(entry + 2));
        result.push_back({name, index});
        entry += nameEntrySize;
    }
    return result;
}

MatchResult Pcre2Wrapper::match(const std::string& subject, size_t startOffset, bool anchored) const {
    MatchResult result;
    result.errorCode = 0;
    result.matchStart = -1;
    result.matchEnd = -1;

    if (!compileOk_) {
        result.status = MatchStatus::CompileError;
        result.errorCode = compileErrorCode_;
        return result;
    }

    pcre2_match_data* matchData = pcre2_match_data_create_from_pattern(code_, nullptr);

    // `anchored` emulates JS's sticky (`y`) flag: PCRE2_ANCHORED forces the
    // match to start exactly at startOffset instead of scanning forward.
    uint32_t runtimeOptions = anchored ? PCRE2_ANCHORED : 0;

    int rc = pcre2_match(
        code_,
        reinterpret_cast<PCRE2_SPTR>(subject.c_str()), subject.size(),
        startOffset, runtimeOptions, matchData, matchContext_);

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
    } else if (rc < 0) {
        result.status = MatchStatus::OtherError;
        result.errorCode = rc;
        PCRE2_UCHAR buf[256];
        pcre2_get_error_message(rc, buf, sizeof(buf));
        result.errorMessage = std::string(reinterpret_cast<char*>(buf));
    } else {
        result.status = MatchStatus::Match;
        PCRE2_SIZE* ovector = pcre2_get_ovector_pointer(matchData);
        uint32_t count = static_cast<uint32_t>(rc);
        result.matchStart = static_cast<long>(ovector[0]);
        result.matchEnd = static_cast<long>(ovector[1]);
        for (uint32_t i = 0; i < count; i++) {
            PCRE2_SIZE start = ovector[2 * i];
            PCRE2_SIZE end = ovector[2 * i + 1];
            if (start == PCRE2_UNSET || end == PCRE2_UNSET) {
                result.groups.push_back("");
                result.groupParticipated.push_back(0);
            } else {
                result.groups.push_back(subject.substr(start, end - start));
                result.groupParticipated.push_back(1);
            }
        }
    }

    pcre2_match_data_free(matchData);
    return result;
}
