# Test Plan: echogarden-supplier.ts

**Author:** Claude Sonnet 4.5
**Date:** 2026-01-12
**Coverage Target:** ≥95% all metrics
**Test File:** `echogarden-supplier.test.ts`

## Code Surface

**Exports:** `EchoGardenSupplier` class
**Dependencies:**
- `@echogarden/icu-segmentation-wasm` (ICUSegmentation.initialize)
- `@echogarden/text-segmentation` (segmentText)
- `intento-core` (ContextFactory, IFunctions, Tracer)
- `n8n-workflow` (NodeConnectionTypes)
- `SuppressionContext`, `EchoGardenDescriptor`, `SplitRequest`, `SplitResponse`, `SegmentsSupplierBase`

**Branches:**
- Line 48: `Array.isArray(request.text)`
- Line 49: `this.context.enabled && this.context.list`
- Line 54: `signal.throwIfAborted()`
- Line 55: `text[i].length === 0`
- Line 56: `text[i].length < request.segmentLimit`
- Line 86: `ICUSegmentation.initialize()` success/failure
- Line 108: `potentialSegment.length <= segmentLimit`
- Line 112: `currentSegment.length > 0` (first occurrence)
- Line 115: `currentSegment.length > 0` (second occurrence)

**ESLint Considerations:**
- Mock types for IFunctions, ICUSegmentation, segmentText
- Use jest-mock-extended for type-safe mocks
- Import order: external → types → implementation

## Test Cases

### EchoGardenSupplier

#### Business Logic (BL-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| BL-01 | should create supplier instance with frozen state | Constructor lines 23-29 |
| BL-02 | should initialize ICU on first split request | Lines 84-92, singleton pattern |
| BL-03 | should handle single text item as string | Line 48 right branch (not array) |
| BL-04 | should handle text array with multiple items | Line 48 left branch (is array) |
| BL-05 | should skip text items shorter than segment limit | Lines 56-59 |
| BL-06 | should segment text exceeding limit | Lines 61-64 |
| BL-07 | should apply suppressions when enabled | Lines 49, 102 (context.enabled = true) |
| BL-08 | should skip suppressions when disabled | Line 49 (context.enabled = false) |
| BL-09 | should combine sentences until limit reached | Lines 107-111 |
| BL-10 | should preserve atomic sentence exceeding limit | Lines 112-114 |
| BL-11 | should push final currentSegment | Line 115 |
| BL-12 | should assign correct textPosition and segmentPosition | Lines 58, 63 |

#### Edge Cases (EC-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EC-01 | should skip empty text items | Line 55 |
| EC-02 | should handle text with single sentence | segmentText single iteration |
| EC-03 | should handle text with no sentences | segmentText empty result |
| EC-04 | should reuse ICU initialization across instances | Singleton behavior |
| EC-05 | should handle suppressions as empty list when null | Line 49 fallback to [] |
| EC-06 | should handle optional language parameter | Line 102 from?: string |

#### Integration Tests (IT-XX) - Language Groups

| ID | Test Name | Coverage Target | Language Sample |
|----|-----------|-----------------|-----------------|
| IT-01 | should segment Cyrillic text (Russian) | Full integration | "Это первое предложение. Это второе предложение." |
| IT-02 | should segment Latin text (English) | Full integration | "This is first sentence. This is second sentence." |
| IT-03 | should segment CJK text (Chinese) | Full integration | "这是第一句。这是第二句。" |
| IT-04 | should segment CJK text (Japanese) | Full integration | "これは最初の文です。これは二番目の文です。" |
| IT-05 | should segment RTL text (Arabic) | Full integration | "هذه الجملة الأولى. هذه الجملة الثانية." |
| IT-06 | should segment RTL text (Hebrew) | Full integration | "זה המשפט הראשון. זה המשפט השני." |
| IT-07 | should segment mixed Latin-Cyrillic | Full integration | "Hello мир. World привет." |
| IT-08 | should handle abbreviations with suppressions (English) | Full integration | "Dr. Smith works at Inc. Company." |
| IT-09 | should segment long multi-sentence text with limit | Full integration | 500+ char text with 100 char limit |
| IT-10 | should preserve sentence integrity in mixed scripts | Full integration | "Test测试. Another另一个." |
| IT-11 | should segment Thai text without explicit punctuation | Full integration | "นี่คือประโยคแรก นี่คือประโยคที่สอง" |
| IT-12 | should segment Khmer text without explicit punctuation | Full integration | "នេះគឺជាប្រយោគមួយ ប្រយោគមួយទៀតនៅទីនេះ" |
| IT-13 | should segment Burmese text without explicit punctuation | Full integration | "ဒါပထမစာကြောင်းပါ ဒါဒုတိယစာကြောင်းပါ" |
| IT-14 | should segment Japanese text with implicit boundaries | Full integration | "これはテストです それから別のテストです" |
| IT-15 | should segment Chinese text without punctuation marks | Full integration | "这是第一句 这是第二句" |
| IT-16 | should segment HTML with tags and preserve structure | Full integration | "<p>First sentence.</p><div>Second sentence.</div>" |
| IT-17 | should segment XML with attributes | Full integration | "<node attr='value'>First sentence.</node><node>Second.</node>" |
| IT-18 | should segment JSON strings without breaking structure | Full integration | '{"text": "First sentence. Second sentence."}' |
| IT-19 | should segment Markdown with formatting | Full integration | "# Heading. **Bold text.** Regular text." |
| IT-20 | should segment text with code blocks | Full integration | "Text before. `code snippet`. Text after." |
| IT-21 | should segment text with placeholders | Full integration | "Hello {name}. Welcome to {place}. Enjoy." |
| IT-22 | should segment text with variables | Full integration | "Value is {{var1}}. Result is {{var2}}." |
| IT-23 | should segment text with URLs | Full integration | "Visit https://example.com. Read more there." |
| IT-24 | should segment text with email addresses | Full integration | "Contact admin@example.com. Or support@test.org." |
| IT-25 | should segment HTML entities | Full integration | "First &amp; second. Third &lt; fourth." |
| IT-26 | should preserve multiple spaces between sentences | Full integration | "Sentence one.  Multiple spaces.   More text." |
| IT-27 | should handle leading/trailing whitespace | Full integration | "  Текст с пробелами.  " (Russian) |
| IT-28 | should segment newlines and paragraphs | Full integration | "First paragraph.\n\nSecond paragraph.\nThird line." |
| IT-29 | should handle tab characters | Full integration | "文本与\t制表符。\t更多文本。" (Chinese) |
| IT-30 | should not split on decimal numbers | Full integration | "The value is 3.14. And 2.71 is another." |
| IT-31 | should handle thousands separators | Full integration | "Стоимость 1,234.56. Всего: 9,876,543 единиц." (Russian) |
| IT-32 | should preserve version numbers | Full integration | "バージョン 2.0.1。リリース v3.14.159 昨日。" (Japanese) |
| IT-33 | should handle date formats | Full integration | "Date: 01.12.2026. Also 12/01/2026 works. تاريخ: 2026/01/12." (Mixed) |
| IT-34 | should not split on time formats | Full integration | "Meeting at 14:30. Or 2:30 p.m. today." |
| IT-35 | should handle common abbreviations | Full integration | "Dr. Smith and Prof. Johnson. They met at U.S.A. Inc." |
| IT-36 | should preserve acronyms with periods | Full integration | "Др. Иванов работает в США. ООН поддержала." (Russian) |
| IT-37 | should handle technical acronyms | Full integration | "API v2.0 released. REST API updated. GraphQL too." |
| IT-38 | should preserve initials | Full integration | "המחבר ש.י. עגנון כתב. ח.נ. ביאליק הסכים." (Hebrew RTL) |
| IT-39 | should segment numbered lists | Full integration | "خطوات: 1. الخطوة الأولى. 2. الخطوة الثانية. 3. الخطوة الأخيرة." (Arabic RTL) |
| IT-40 | should handle lettered lists | Full integration | "Options: a) First choice. b) Second option. c) Last one." |
| IT-41 | should preserve bullet points | Full integration | "项目：• 第一项。• 第二项。• 第三项。" (Chinese) |
| IT-42 | should handle quoted sentences | Full integration | "He said 'Hello world.' Then left. She replied 'Goodbye.'" |
| IT-43 | should preserve nested quotes | Full integration | "Она сказала: 'Он сказал: «Привет».' Вчера." (Russian) |
| IT-44 | should segment dialog attribution | Full integration | "「こんにちは」と彼は言った。「元気ですか」と彼女は尋ねた。" (Japanese) |
| IT-45 | should handle ellipsis | Full integration | "Wait... Something's wrong. Really... Think about it." |
| IT-46 | should preserve em dash | Full integration | "החלק הראשון—הערה חשובה—ממשיך כאן. סיום." (Hebrew RTL) |
| IT-47 | should handle parentheses mid-sentence | Full integration | "Текст (с примечанием). Еще (другое примечание) здесь." (Russian) |
| IT-48 | should handle question/exclamation combos | Full integration | "Really?! Are you sure?! Wow!" |
| IT-49 | should preserve phone numbers | Full integration | "Call +1-555-123-4567. Or (555) 123.4567 works." |
| IT-50 | should handle file paths | Full integration | "See file.txt. Or /path/to/file.json for details." |
| IT-51 | should preserve currency symbols | Full integration | "Costs €99.99. Also £50.00 and ¥1000 available." |
| IT-52 | should handle mathematical expressions | Full integration | "Formula: a+b=c. Also x²+y²=z² applies." |
| IT-53 | should preserve chemical formulas | Full integration | "الماء هو H₂O. ثاني أكسيد الكربون: CO₂. صيغة." (Arabic RTL) |
| IT-54 | should preserve untranslatable terms | Full integration | "Product name SuperApp™. Version MacroTool® 3.0." |
| IT-55 | should handle mixed RTL/LTR | Full integration | "English text עברית text العربية continues." |
| IT-56 | should segment mixed CJK/Latin | Full integration | "日本語 text with English. 中文 mixed content." |
| IT-57 | should handle sentence-ending abbreviations | Full integration | "Company: Apple Inc. Location: USA. Founded: 1976." |
| IT-58 | should preserve contractions | Full integration | "It's working. They're done. Won't stop. Can't fail." |
| IT-59 | should handle CAT tool tags | Full integration | "Text <g id='1'>with tags</g>. More <x id='2'/> content." |
| IT-60 | should preserve placeholders with numbers | Full integration | "Welcome {0}. Your score: {1}. Rank: {2}." |
| IT-61 | should handle printf-style formatting | Full integration | "Hello %s. Value: %d. Percent: %.2f done." |
| IT-62 | should preserve ICU MessageFormat | Full integration | "You have {count, plural, one {# item} other {# items}}." |
| IT-63 | should handle non-breaking spaces | Full integration | "Company Name. Another Company." (NBSP U+00A0) |
| IT-64 | should preserve very long sentence | Full integration | Russian 500+ char sentence |
| IT-65 | should combine multiple short sentences | Full integration | "Hi. OK. Yes. No. Maybe. Sure. Fine. Good. Great. Done." |
| IT-66 | should handle alternating long/short | Full integration | "Short. This is a longer sentence with more content. Brief." |
| IT-67 | should segment Thai without punctuation | Full integration | "นี่คือประโยคแรก นี่คือประโยคที่สอง นี่คือประโยคที่สาม" |
| IT-68 | should segment Khmer without punctuation | Full integration | "នេះជាប្រយោគទីមួយ នេះជាប្រយោគទីពីរ នេះជាប្រយោគទីបី" |
| IT-69 | should segment Burmese without punctuation | Full integration | "ဒါပထမစာကြောင်း ဒါဒုတိယစာကြောင်း ဒါတတိယစာကြောင်း" |
| IT-70 | should segment Lao without punctuation | Full integration | "ນີ້ແມ່ນປະໂຫຍກທຳອິດ ນີ້ແມ່ນປະໂຫຍກທີສອງ ນີ້ແມ່ນປະໂຫຍກທີສາມ" |

#### Error Handling (EH-XX)

| ID | Test Name | Coverage Target |
|----|-----------|-----------------|
| EH-01 | should reset icuInitialized on initialization failure | Lines 88-91 catch block |
| EH-02 | should throw error from ICU initialization | Line 91 throw |
| EH-03 | should respect abort signal at method start | Line 43 signal.throwIfAborted() |
| EH-04 | should respect abort signal in loop | Line 54 signal.throwIfAborted() |
| EH-05 | should propagate segmentText errors | Error handling in segmentText call |

## Mock Setup Requirements

### IFunctions Mock
```typescript
{
  getNodeParameter: jest.fn(),
  getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
  getExecutionId: jest.fn().mockReturnValue('test-exec-id'),
  // ... other required properties
}
```

### ICUSegmentation Mock
```typescript
jest.mock('@echogarden/icu-segmentation-wasm', () => ({
  initialize: jest.fn()
}));
```

### segmentText Mock
```typescript
jest.mock('@echogarden/text-segmentation', () => ({
  segmentText: jest.fn()
}));
```

### ContextFactory Mock
- Mock to return SuppressionContext with controlled enabled/list values

## Coverage Strategy

**Target Metrics:** ≥95% for statements, branches, functions, lines

**Critical Paths:**
1. Constructor → executeSplit → initializeICU → segmentText (happy path)
2. ICU initialization failure → reset → retry (error recovery)
3. Abort signal handling (cancellation)
4. All language scripts (integration tests)

**Branch Coverage:**
- Array check: test both string and array inputs
- Context check: test enabled=true/false, list=null/array
- Length checks: test <limit, =limit, >limit
- Empty check: test empty strings
- Sentence combining: test all branches in segmentText loop

## Success Criteria

- [x] Test plan created with author and date
- [x] All exports identified and planned
- [x] All branches covered (100%)
- [x] All error paths tested
- [x] Integration tests for 6+ language groups (Cyrillic, Latin, CJK, RTL, Mixed)
- [x] ESLint considerations documented
- [ ] Implementation achieves ≥95% coverage (all metrics)
- [ ] All tests pass
- [ ] `pnpm lint:fix` and `pnpm build` succeed
