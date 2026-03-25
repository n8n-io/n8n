# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.10](https://github.com/xmldom/xmldom/compare/0.8.9...0.8.10)

### Fixed

- dom: prevent iteration over deleted items [`#514`](https://github.com/xmldom/xmldom/pull/514)/ [`#499`](https://github.com/xmldom/xmldom/issues/499)

Thank you, [@qtow](https://github.com/qtow), for your contributions


## [0.8.9](https://github.com/xmldom/xmldom/compare/0.8.8...0.8.9)

### Fixed

- Set nodeName property in ProcessingInstruction [`#509`](https://github.com/xmldom/xmldom/pull/509) / [`#505`](https://github.com/xmldom/xmldom/issues/505)

Thank you, [@cjbarth](https://github.com/cjbarth), for your contributions


## [0.8.8](https://github.com/xmldom/xmldom/compare/0.8.7...0.8.8)

### Fixed

- extend list of HTML entities [`#489`](https://github.com/xmldom/xmldom/pull/489)

Thank you, [@zorkow](https://github.com/zorkow), for your contributions

## [0.8.7](https://github.com/xmldom/xmldom/compare/0.8.6...0.8.7)

### Fixed

- properly parse closing where the last attribute has no value [`#485`](https://github.com/xmldom/xmldom/pull/485) / [`#486`](https://github.com/xmldom/xmldom/issues/486)

Thank you, [@bulandent](https://github.com/bulandent), for your contributions


## [0.7.10](https://github.com/xmldom/xmldom/compare/0.7.9...0.7.10)

### Fixed

- properly parse closing where the last attribute has no value [`#485`](https://github.com/xmldom/xmldom/pull/485) / [`#486`](https://github.com/xmldom/xmldom/issues/486)

Thank you, [@bulandent](https://github.com/bulandent), for your contributions


## [0.8.6](https://github.com/xmldom/xmldom/compare/0.8.5...0.8.6)

### Fixed

- Properly check nodes before replacement [`#457`](https://github.com/xmldom/xmldom/pull/457) / [`#455`](https://github.com/xmldom/xmldom/issues/455) / [`#456`](https://github.com/xmldom/xmldom/issues/456)

Thank you, [@edemaine](https://github.com/edemaine), [@pedro-l9](https://github.com/pedro-l9), for your contributions


## [0.8.5](https://github.com/xmldom/xmldom/compare/0.8.4...0.8.5)

### Fixed

- fix: Restore ES5 compatibility [`#452`](https://github.com/xmldom/xmldom/pull/452) / [`#453`](https://github.com/xmldom/xmldom/issues/453)

Thank you, [@fengxinming](https://github.com/fengxinming), for your contributions


## [0.8.4](https://github.com/xmldom/xmldom/compare/0.8.3...0.8.4)

### Fixed

- Security: Prevent inserting DOM nodes when they are not well-formed [`CVE-2022-39353`](https://github.com/xmldom/xmldom/security/advisories/GHSA-crh6-fp67-6883)
  In case such a DOM would be created, the part that is not well-formed will be transformed into text nodes, in which xml specific characters like `<` and `>` are encoded accordingly.
  In the upcoming version 0.9.0 those text nodes will no longer be added and an error will be thrown instead.
  This change can break your code, if you relied on this behavior, e.g. multiple root elements in the past. We consider it more important to align with the specs that we want to be aligned with, considering the potential security issues that might derive from people not being aware of the difference in behavior.
  Related Spec: <https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity>

Thank you, [@frumioj](https://github.com/frumioj), [@cjbarth](https://github.com/cjbarth), [@markgollnick](https://github.com/markgollnick) for your contributions


## [0.8.3](https://github.com/xmldom/xmldom/compare/0.8.3...0.8.2)

### Fixed
- Avoid iterating over prototype properties [`#437`](https://github.com/xmldom/xmldom/pull/437) / [`#436`](https://github.com/xmldom/xmldom/issues/436)

Thank you, [@Supraja9726](https://github.com/Supraja9726) for your contributions


## [0.8.2](https://github.com/xmldom/xmldom/compare/0.8.1...0.8.2)

### Fixed
- fix(dom): Serialize `&gt;` as specified (#395) [`#58`](https://github.com/xmldom/xmldom/issues/58)

### Other
- docs: Add `nodeType` values to public interface description [`#396`](https://github.com/xmldom/xmldom/pull/396)
- test: Add executable examples for node and typescript [`#317`](https://github.com/xmldom/xmldom/pull/317)
- fix(dom): Serialize `&gt;` as specified [`#395`](https://github.com/xmldom/xmldom/pull/395)
- chore: Add minimal `Object.assign` ponyfill [`#379`](https://github.com/xmldom/xmldom/pull/379)
- docs: Refine release documentation [`#378`](https://github.com/xmldom/xmldom/pull/378)
- chore: update various dev dependencies

Thank you [@niklasl](https://github.com/niklasl), [@cburatto](https://github.com/cburatto), [@SheetJSDev](https://github.com/SheetJSDev), [@pyrsmk](https://github.com/pyrsmk) for your contributions

## [0.8.1](https://github.com/xmldom/xmldom/compare/0.8.0...0.8.1)

### Fixes
- Only use own properties in entityMap [`#374`](https://github.com/xmldom/xmldom/pull/374)

### Docs
- Add security policy [`#365`](https://github.com/xmldom/xmldom/pull/365)
- changelog: Correct contributor name and link [`#366`](https://github.com/xmldom/xmldom/pull/366)
- Describe release/publish steps [`#358`](https://github.com/xmldom/xmldom/pull/358), [`#376`](https://github.com/xmldom/xmldom/pull/376)
- Add snyk package health badge [`#360`](https://github.com/xmldom/xmldom/pull/360)


## [0.8.0](https://github.com/xmldom/xmldom/compare/0.7.5...0.8.0)

### Fixed
- Normalize all line endings according to XML specs [1.0](https://w3.org/TR/xml/#sec-line-ends) and [1.1](https://www.w3.org/TR/xml11/#sec-line-ends) \
  BREAKING CHANGE: Certain combination of line break characters are normalized to a single `\n` before parsing takes place and will no longer be preserved.
  - [`#303`](https://github.com/xmldom/xmldom/issues/303) / [`#307`](https://github.com/xmldom/xmldom/pull/307)
  - [`#49`](https://github.com/xmldom/xmldom/issues/49), [`#97`](https://github.com/xmldom/xmldom/issues/97), [`#324`](https://github.com/xmldom/xmldom/issues/324) / [`#314`](https://github.com/xmldom/xmldom/pull/314)
- XMLSerializer: Preserve whitespace character references [`#284`](https://github.com/xmldom/xmldom/issues/284) / [`#310`](https://github.com/xmldom/xmldom/pull/310) \
  BREAKING CHANGE: If you relied on the not spec compliant preservation of literal `\t`, `\n` or `\r` in **attribute values**.
  To preserve those you will have to create XML that instead contains the correct numerical (or hexadecimal) equivalent (e.g. `&#x9;`, `&#xA;`, `&#xD;`).
- Drop deprecated exports `DOMImplementation` and `XMLSerializer` from `lib/dom-parser.js` [#53](https://github.com/xmldom/xmldom/issues/53) / [`#309`](https://github.com/xmldom/xmldom/pull/309)
  BREAKING CHANGE: Use the one provided by the main package export.
- dom: Remove all links as part of `removeChild` [`#343`](https://github.com/xmldom/xmldom/issues/343) / [`#355`](https://github.com/xmldom/xmldom/pull/355)

### Chore
- ci: Restore latest tested node version to 16.x [`#325`](https://github.com/xmldom/xmldom/pull/325)
- ci: Split test and lint steps into jobs [`#111`](https://github.com/xmldom/xmldom/issues/111) / [`#304`](https://github.com/xmldom/xmldom/pull/304)
- Pinned and updated devDependencies

Thank you [@marrus-sh](https://github.com/marrus-sh), [@victorandree](https://github.com/victorandree), [@mdierolf](https://github.com/mdierolf), [@tsabbay](https://github.com/tsabbay), [@fatihpense](https://github.com/fatihpense) for your contributions

## 0.7.5

[Commits](https://github.com/xmldom/xmldom/compare/0.7.4...0.7.5)

### Fixes:

- Preserve default namespace when serializing [`#319`](https://github.com/xmldom/xmldom/issues/319) / [`#321`](https://github.com/xmldom/xmldom/pull/321)
  Thank you, [@lupestro](https://github.com/lupestro)

## 0.7.4

[Commits](https://github.com/xmldom/xmldom/compare/0.7.3...0.7.4)

### Fixes:

- Restore ability to parse `__prototype__` attributes [`#315`](https://github.com/xmldom/xmldom/pull/315)
  Thank you, [@dsimpsonOMF](https://github.com/dsimpsonOMF)

## 0.7.3

[Commits](https://github.com/xmldom/xmldom/compare/0.7.2...0.7.3)

### Fixes:

- Add doctype when parsing from string [`#277`](https://github.com/xmldom/xmldom/issues/277) / [`#301`](https://github.com/xmldom/xmldom/pull/301)
- Correct typo in error message [`#294`](https://github.com/xmldom/xmldom/pull/294)
  Thank you, [@rrthomas](https://github.com/rrthomas)

### Refactor:

- Improve exports & require statements, new main package entry [`#233`](https://github.com/xmldom/xmldom/pull/233)

### Docs:

- Fix Stryker badge [`#298`](https://github.com/xmldom/xmldom/pull/298)
- Fix link to help-wanted issues [`#299`](https://github.com/xmldom/xmldom/pull/299)

### Chore:

- Execute stryker:dry-run on branches [`#302`](https://github.com/xmldom/xmldom/pull/302)
- Fix stryker config [`#300`](https://github.com/xmldom/xmldom/pull/300)
- Split test and lint scripts [`#297`](https://github.com/xmldom/xmldom/pull/297)
- Switch to stryker dashboard owned by org [`#292`](https://github.com/xmldom/xmldom/pull/292)

## 0.7.2

[Commits](https://github.com/xmldom/xmldom/compare/0.7.1...0.7.2)

### Fixes:

- Types: Add index.d.ts to packaged files [`#288`](https://github.com/xmldom/xmldom/pull/288)
  Thank you, [@forty](https://github.com/forty)

## 0.7.1

[Commits](https://github.com/xmldom/xmldom/compare/0.7.0...0.7.1)

### Fixes:

- Types: Copy types from DefinitelyTyped [`#283`](https://github.com/xmldom/xmldom/pull/283)
  Thank you, [@kachkaev](https://github.com/kachkaev)

### Chore:
- package.json: remove author, maintainers, etc. [`#279`](https://github.com/xmldom/xmldom/pull/279)

## 0.7.0 

[Commits](https://github.com/xmldom/xmldom/compare/0.6.0...0.7.0)

Due to [`#271`](https://github.com/xmldom/xmldom/issue/271) this version was published as
- unscoped `xmldom` package to github (git tags [`0.7.0`](https://github.com/xmldom/xmldom/tree/0.7.0) and [`0.7.0+unscoped`](https://github.com/xmldom/xmldom/tree/0.7.0%2Bunscoped))
- scoped `@xmldom/xmldom` package to npm (git tag `0.7.0+scoped`)
For more details look at [`#278`](https://github.com/xmldom/xmldom/pull/278#issuecomment-902172483)

### Fixes:

- Security: Misinterpretation of malicious XML input [`CVE-2021-32796`](https://github.com/xmldom/xmldom/security/advisories/GHSA-5fg8-2547-mr8q)
- Implement `Document.getElementsByClassName` as specified [`#213`](https://github.com/xmldom/xmldom/pull/213), thank you, [@ChALkeR](https://github.com/ChALkeR)
- Inherit namespace prefix from parent when required [`#268`](https://github.com/xmldom/xmldom/pull/268)
- Handle whitespace in closing tags [`#267`](https://github.com/xmldom/xmldom/pull/267)
- Update `DOMImplementation` according to recent specs [`#210`](https://github.com/xmldom/xmldom/pull/210)  
  BREAKING CHANGE: Only if you "passed features to be marked as available as a constructor arguments" and expected it to "magically work".
- No longer serializes any namespaces with an empty URI [`#244`](https://github.com/xmldom/xmldom/pull/244)   
  (related to [`#168`](https://github.com/xmldom/xmldom/pull/168) released in 0.6.0)  
  BREAKING CHANGE: Only if you rely on ["unsetting" a namespace prefix](https://github.com/xmldom/xmldom/pull/168#issuecomment-886984994) by setting it to an empty string 
- Set `localName` as part of `Document.createElement` [`#229`](https://github.com/xmldom/xmldom/pull/229), thank you, [@rrthomas](https://github.com/rrthomas)

### CI

- We are now additionally running tests against node v16
- Stryker tests on the master branch now run against node v14

### Docs

- Describe relations with and between specs: [`#211`](https://github.com/xmldom/xmldom/pull/211), [`#247`](https://github.com/xmldom/xmldom/pull/247)

## 0.6.0

[Commits](https://github.com/xmldom/xmldom/compare/0.5.0...0.6.0)

### Fixes

- Stop serializing empty namespace values like `xmlns:ds=""` [`#168`](https://github.com/xmldom/xmldom/pull/168)  
  BREAKING CHANGE: If your code expected empty namespaces attributes to be serialized.  
  Thank you, [@pdecat](https://github.com/pdecat) and [@FranckDepoortere](https://github.com/FranckDepoortere)
- Escape `<` to `&lt;` when serializing attribute values [`#198`](https://github.com/xmldom/xmldom/issues/198) / [`#199`](https://github.com/xmldom/xmldom/pull/199)

## 0.5.0

[Commits](https://github.com/xmldom/xmldom/compare/0.4.0...0.5.0)

### Fixes
- Avoid misinterpretation of malicious XML input - [`GHSA-h6q6-9hqw-rwfv`](https://github.com/xmldom/xmldom/security/advisories/GHSA-h6q6-9hqw-rwfv) (CVE-2021-21366)
  - Improve error reporting; throw on duplicate attribute\
    BREAKING CHANGE: It is currently not clear how to consistently deal with duplicate attributes, so it's also safer for our users to fail when detecting them.
    It's possible to configure the `DOMParser.errorHandler` before parsing, to handle those errors differently.

    To accomplish this and also be able to verify it in tests I needed to
    - create a new `Error` type `ParseError` and export it
    - Throw `ParseError` from `errorHandler.fatalError` and prevent those from being caught in `XMLReader`.
    - export `DOMHandler` constructor as `__DOMHandler`
  - Preserve quotes in DOCTYPE declaration
    Since the only purpose of parsing the DOCTYPE is to be able to restore it when serializing, we decided that it would be best to leave the parsed `publicId` and `systemId` as is, including any quotes.
    BREAKING CHANGE: If somebody relies on the actual unquoted values of those ids, they will need to take care of either single or double quotes and the right escaping.
    (Without this change this would not have been possible because the SAX parser already dropped the information about the quotes that have been used in the source.)

    https://www.w3.org/TR/2006/REC-xml11-20060816/#dtd
    https://www.w3.org/TR/2006/REC-xml11-20060816/#IDAX1KS (External Entity Declaration)

- Fix breaking preprocessors' directives when parsing attributes [`#171`](https://github.com/xmldom/xmldom/pull/171)
- fix(dom): Escape `]]&gt;` when serializing CharData [`#181`](https://github.com/xmldom/xmldom/pull/181)
- Switch to (only) MIT license (drop problematic LGPL license option) [`#178`](https://github.com/xmldom/xmldom/pull/178)
- Export DOMException; remove custom assertions; etc.  [`#174`](https://github.com/xmldom/xmldom/pull/174)

### Docs
- Update MDN links in `readme.md` [`#188`](https://github.com/xmldom/xmldom/pull/188)

## 0.4.0

[Commits](https://github.com/xmldom/xmldom/compare/0.3.0...0.4.0)

### Fixes
- **BREAKING** Restore `&nbsp;` behavior from v0.1.27 [`#67`](https://github.com/xmldom/xmldom/pull/67)
- **BREAKING** Typecheck source param before parsing [`#113`](https://github.com/xmldom/xmldom/pull/113)
- Include documents in package files list [`#156`](https://github.com/xmldom/xmldom/pull/156)
- Preserve doctype with sysid [`#144`](https://github.com/xmldom/xmldom/pull/144)
- Remove ES6 syntax from getElementsByClassName [`#91`](https://github.com/xmldom/xmldom/pull/91)
- Revert "Add lowercase of åäö in entityMap" due to duplicate entries [`#84`](https://github.com/xmldom/xmldom/pull/84)
- fix: Convert all line separators to LF [`#66`](https://github.com/xmldom/xmldom/pull/66)

### Docs
- Update CHANGELOG.md through version 0.3.0 [`#63`](https://github.com/xmldom/xmldom/pull/63)
- Update badges [`#78`](https://github.com/xmldom/xmldom/pull/78)
- Add .editorconfig file [`#104`](https://github.com/xmldom/xmldom/pull/104)
- Add note about import [`#79`](https://github.com/xmldom/xmldom/pull/79)
- Modernize & improve the example in readme.md [`#81`](https://github.com/xmldom/xmldom/pull/81)

### CI
- Add Stryker Mutator [`#70`](https://github.com/xmldom/xmldom/pull/70)
- Add Stryker action to update dashboard [`#77`](https://github.com/xmldom/xmldom/pull/77)
- Add Node GitHub action workflow [`#64`](https://github.com/xmldom/xmldom/pull/64)
- add & enable eslint [`#106`](https://github.com/xmldom/xmldom/pull/106)
- Use eslint-plugin-es5 to enforce ES5 syntax [`#107`](https://github.com/xmldom/xmldom/pull/107)
- Recover `vows` tests, drop `proof` tests [`#59`](https://github.com/xmldom/xmldom/pull/59)
- Add jest tessuite and first tests [`#114`](https://github.com/xmldom/xmldom/pull/114)
- Add jest testsuite with `xmltest` cases [`#112`](https://github.com/xmldom/xmldom/pull/112)
- Configure Renovate [`#108`](https://github.com/xmldom/xmldom/pull/108)
- Test European HTML entities [`#86`](https://github.com/xmldom/xmldom/pull/86)
- Updated devDependencies

### Other
- Remove files that are not of any use [`#131`](https://github.com/xmldom/xmldom/pull/131), [`#65`](https://github.com/xmldom/xmldom/pull/65), [`#33`](https://github.com/xmldom/xmldom/pull/33)

## 0.3.0

[Commits](https://github.com/xmldom/xmldom/compare/0.2.1...0.3.0)

- **BREAKING** Node >=10.x is now required.
- **BREAKING** Remove `component.json` (deprecated package manager https://github.com/componentjs/guide)
- **BREAKING** Move existing sources into `lib` subdirectory.
- **POSSIBLY BREAKING** Introduce `files` entry in `package.json` and remove use of `.npmignore`.
- [Add `Document.getElementsByClassName`](https://github.com/xmldom/xmldom/issues/24).
- [Add `Node` to the list of exports](https://github.com/xmldom/xmldom/pull/27)
- [Add lowercase of åäö in `entityMap`](https://github.com/xmldom/xmldom/pull/23).
- Move CHANGELOG to markdown file.
- Move LICENSE to markdown file.

## 0.2.1

[Commits](https://github.com/xmldom/xmldom/compare/0.2.0...0.2.1)

- Correct `homepage`, `repository` and `bugs` URLs in `package.json`.

## 0.2.0

[Commits](https://github.com/xmldom/xmldom/compare/v0.1.27...0.2.0)

- Includes all **BREAKING** changes introduced in [`xmldom-alpha@v0.1.28`](#0128) by the original authors.
- **POSSIBLY BREAKING** [remove the `Object.create` check from the `_extends` method of `dom.js` that added a `__proto__` property](https://github.com/xmldom/xmldom/commit/0be2ae910a8a22c9ec2cac042e04de4c04317d2a#diff-7d1c5d97786fdf9af5446a241d0b6d56L19-L22) ().
- **POSSIBLY BREAKING** [remove code that added a `__proto__` property](https://github.com/xmldom/xmldom/commit/366159a76a181ce9a0d83f5dc48205686cfaf9cc)
- formatting/corrections in `package.json`

## 0.1.31

[Commits](https://github.com/xmldom/xmldom/compare/v0.1.27...v0.1.31)

The patch versions (`v0.1.29` - `v0.1.31`) that have been released on the [v0.1.x branch](https://github.com/xmldom/xmldom/tree/0.1.x), to reflect the changed maintainers, **are branched off from [`v0.1.27`](#0127) so they don't include the breaking changes introduced in [`xmldom-alpha@v0.1.28`](#0128)**:

## Maintainer changes

After the last commit to the original repository <https://github.com/jindw/xmldom> on the 9th of May 2017, the first commit to <https://github.com/xmldom/xmldom> is from the 19th of December 2019. [The fork has been announced in the original repository on the 2nd of March 2020.](https://github.com/jindw/xmldom/issues/259)

The versions listed below have been published to one or both of the following packages:
- <https://www.npmjs.com/package/xmldom-alpha>
- <https://www.npmjs.com/package/xmldom>

It is currently not planned to continue publishing the `xmldom-alpha` package.

The new maintainers did not invest time to understand changes that led to the last `xmldom` version [`0.1.27`](#0127) published by the original maintainer, but consider it the basis for their work.
A timeline of all the changes that happened from that version until `0.3.0` is available in <https://github.com/xmldom/xmldom/issues/62>. Any related questions should be asked there.

## 0.1.28

[Commits](https://github.com/xmldom/xmldom/compare/v0.1.27...xmldom-alpha@v0.1.28)

Published by @jindw on the 9th of May 2017 as
- `xmldom-alpha@0.1.28`

- **BREAKING** includes [regression regarding `&nbsp;` (issue #57)](https://github.com/xmldom/xmldom/issues/57) 
- [Fix `license` field in `package.json`](https://github.com/jindw/xmldom/pull/178)
- [Conditional converting of HTML entities](https://github.com/jindw/xmldom/pull/80)
- Fix `dom.js` serialization issue for missing document element ([example that failed on `toString()` before this change](https://github.com/xmldom/xmldom/blob/a58dcf7a265522e80ce520fe3be0cddb1b976f6f/test/parse/unclosedcomment.js#L10-L11))
- Add new module `entities.js`

## 0.1.27

Published by @jindw on the 28th of Nov 2016 as 
- `xmldom@0.1.27`
- `xmldom-alpha@0.1.27` 

- Various bug fixes.

## 0.1.26

Published on the 18th of Nov 2016
as `xmldom@0.1.26`

- Details unknown

## 0.1.25

Published on the 18th of Nov 2016 as 
- `xmldom@0.1.25`

- Details unknown

## 0.1.24

Published on the 27th of November 2016 as
- `xmldom@0.1.24`
- `xmldom-alpha@0.1.24`

- Added node filter.

## 0.1.23

Published on the 5th of May 2016 as
- `xmldom-alpha@0.1.23`

- Add namespace support for nest node serialize.
- Various other bug fixes.

## 0.1.22

- Merge XMLNS serialization.
- Remove \r from source string.
- Print namespaces for child elements.
- Switch references to nodeType to use named constants.
- Add nodelist toString support.

## 0.1.21

- Fix serialize bug.

## 0.1.20

- Optimize invalid XML support.
- Add toString sorter for attributes output.
- Add html self closed node button.
- Add `*` NS support for getElementsByTagNameNS.
- Convert attribute's value to string in setAttributeNS.
- Add support for HTML entities for HTML docs only.
- Fix TypeError when Document is created with DocumentType.

## 0.1.19

- Fix [infinite loop on unclosed comment (jindw/xmldom#68)](https://github.com/jindw/xmldom/issues/68)
- Add error report for unclosed tag.
- Various other fixes.

## 0.1.18

- Add default `ns` support.
- parseFromString now renders entirely plain text documents as textNode.
- Enable option to ignore white space on parsing.

## 0.1.17

**Details missing for this and potential earlier version**

## 0.1.16

- Correctly handle multibyte Unicode greater than two byts. #57. #56.
- Initial unit testing and test coverage. #53. #46. #19.
- Create Bower `component.json` #52.

## 0.1.8

- Add: some test case from node-o3-xml(excludes xpath support)
- Fix: remove existed attribute before setting  (bug introduced in v0.1.5)
- Fix: index direct access for childNodes and any NodeList collection(not w3c standard)
- Fix: remove last child bug
