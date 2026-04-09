<p align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/biomejs/resources/main/svg/slogan-dark-transparent.svg">
        <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/biomejs/resources/main/svg/slogan-light-transparent.svg">
        <img alt="Biome - Toolchain of the web" src="https://raw.githubusercontent.com/biomejs/resources/main/svg/slogan-light-transparent.svg" width="700">
    </picture>
</p>

<div align="center">

[![Discord chat][discord-badge]][discord-url]
[![CI on main][ci-badge]][ci-url]
[![npm version][npm-badge]][npm-url]
[![VSCode version][vscode-badge]][vscode-url]
[![Open VSX version][open-vsx-badge]][open-vsx-url]

[discord-badge]: https://badgen.net/discord/online-members/BypW39g6Yc?icon=discord&label=discord&color=green
[discord-url]: https://biomejs.dev/chat
[ci-badge]: https://github.com/biomejs/biome/actions/workflows/main.yml/badge.svg
[ci-url]: https://github.com/biomejs/biome/actions/workflows/main.yml
[npm-badge]: https://badgen.net/npm/v/@biomejs/biome?icon=npm&color=green&label=%40biomejs%2Fbiome
[npm-url]: https://www.npmjs.com/package/@biomejs/biome/v/latest
[vscode-badge]: https://badgen.net/vs-marketplace/v/biomejs.biome?label=vscode&icon=visualstudio&color=green
[vscode-url]: https://marketplace.visualstudio.com/items?itemName=biomejs.biome
[open-vsx-badge]: https://badgen.net/open-vsx/version/biomejs/biome?label=open-vsx&color=green
[open-vsx-url]: https://open-vsx.org/extension/biomejs/biome

</div>

<!-- Insert new entries lexicographically by language code.
     For example given below is the same order as these files appear on page:
     https://github.com/biomejs/biome/tree/main/packages/%40biomejs/biome -->
<div align="center">

[हिन्दी](https://github.com/biomejs/biome/blob/main/packages/%40biomejs/biome/README.hi.md) | [English](https://github.com/biomejs/biome/blob/main/packages/%40biomejs/biome/README.md) | [繁體中文](https://github.com/biomejs/biome/blob/main/packages/%40biomejs/biome/README.zh-TW.md) | [简体中文](https://github.com/biomejs/biome/blob/main/packages/%40biomejs/biome/README.zh-CN.md) | [日本語](https://github.com/biomejs/biome/blob/main/packages/%40biomejs/biome/README.ja.md) | [Português do Brasil](https://github.com/biomejs/biome/blob/main/packages/%40biomejs/biome/README.pt-br.md) | 한글

</div>


**Biome** 은 웹 프로젝트를 위한 고성능 툴체인으로, 프로젝트를 건전하게 유지하기 위한 개발자 툴을 제공하는 것을 목표로 하고 있습니다.

**Biome** 은 _JavaScript_, _TypeScript_, _JSX_ 그리고 _JSON_ 을 위한 **[고속 Formatter](./benchmark#formatting)** 로, **[_Prettier_ 와의 호환성 97%](https://console.algora.io/challenges/prettier)** 을 달성하고 있습니다.

**Biome** 은 _JavaScript_, _TypeScript_, _JSX_을 위한 **[고성능 Linter](https://github.com/biomejs/biome/tree/main/benchmark#linting)** 로、ESLint, typescript-eslint, [등의 리소스](https://github.com/biomejs/biome/discussions/3)에서 **[270개 이상의 룰](https://biomejs.dev/linter/rules/)** 을 제공하고 있습니다. Biome 은 **상세하며 문맥에 맞는 결과를 출력**하기 위해, 코드를 개선하고, 더 좋은 프로그래머가 되기 위한 도움을 드립니다!

**Biome** 은 처음부터 [**에디터 내에서 인터렉티브하게**](https://biomejs.dev/ja/guides/integrate-in-editor/) 사용하도록 설계되어 있습니다.
여러분이 코드를 작성할 때, 형식이 잘못된 코드에 format, lint 를 적용합니다.

### 설치

```shell
npm install --save-dev --save-exact @biomejs/biome
```

### 사용법

```shell
# 파일의 format을 체크
npx @biomejs/biome format --write ./src

# 파일의 lint를 체크
npx @biomejs/biome lint ./src

# format、lint 등을 실행하고, Biome으로부터의 제안을 적용
npx @biomejs/biome check --write ./src

# CI 환경에서는 모든 파일을 대상으로 format과 lint를 체크
npx @biomejs/biome ci ./src
```

Biome 을 설치하지 않고 사용해보고 싶다면, WebAssembly 에 컴파일된 [온라인 플레이그라운드](https://biomejs.dev/playground/)을 이용해주세요.

## 문서

Biome 에 대해 알아보기 위해 [홈페이지][biomejs]를 체크하거나, Biome 을 사용하기 위해 [시작하기][getting-started]을 확인하세요!

## Biome 를 자세히 알아보기

**Biome** 은 이성적인 디폴트 세팅을 가지고 있어, 설정을 필요로 하지 않습니다.

**Biome** 은 모던한 웹개발에 대한 [모든 주요 언어][language-support]를 지원하는 것을 목표로 합니다.

**Biome** 이 동작하는 데에 Node.js 는 필요하지 않습니다.

**Biome** 은 소스 코드의 완전한 표현력과 에러 회피 능력을 가진, 세련된 Parser 에 의해 우수한 LSP 지원을 제공합니다.

**Biome** 은 지금까지 서로 다른 툴로 제공하던 기능들을 통합합니다. 공통된 기반을 구축하는 것으로 코드 처리, 에러 표시, 병렬 처리, 캐시, 설정에 대해 일관된 경험을 제공합니다.

관심이 있는 분은 [프로젝트 철학][biome-philosophy] 을 확인해주세요.

**Biome** 은 [MIT 라이센스](https://github.com/biomejs/biome/tree/main/LICENSE-MIT) 혹은 [Apache 2.0 라이센스](https://github.com/biomejs/biome/tree/main/LICENSE-APACHE)로, [기여자 행동 규범](https://github.com/biomejs/biome/tree/main/CODE_OF_CONDUCT.md)에 따라 관리되고 있습니다.

## 펀딩

다양한 방법으로 프로젝트를 지원할 수 있습니다.

### 프로젝트 스폰서와 펀딩

[Open collective](https://opencollective.com/biome) 혹은 [GitHub sponsors](https://github.com/sponsors/biomejs)를 통해 스폰서과 되거나 프로젝트에 지원을 할 수 있습니다.

Biome 은 간단하게 다양한 개발자들 사이에서의 인지도를 얻을 수 있는 스폰서쉽 프로그램을 제공합니다.

### 이슈 펀딩

우리는 투표와 여러분들이 원하는 신기능 추진을 위해 [Polar.sh](https://polar.sh/biomejs)을 사용하고 있습니다. 백로그를 체크하고 지원해주세요!

<a href="https://polar.sh/biomejs"><img src="https://polar.sh/embed/fund-our-backlog.svg?org=biomejs" /></a>

## 후원

### 골드 스폰서

### 실버 스폰서

<table>
  <tbody>
    <tr>
      <td align="center" valign="middle">
        <a href="https://l2beat.com/" target="_blank"><img src="https://images.opencollective.com/l2beat/c2b2a27/logo/256.png" height="100"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://www.phoenixlabs.dev/" target="_blank"><img src="https://images.opencollective.com/phoenix-labs/2824ed4/logo/100.png?height=100" height="100"></a>
      </td>
    </tr>
  </tbody>
</table>

### 브론즈 스폰서

<table>
  <tbody>
    <tr>
      <td align="center" valign="middle">
        <a href="https://www.kanamekey.com" target="_blank"><img src="https://images.opencollective.com/kaname/d15fd98/logo/256.png?height=80" width="80"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://nanabit.dev/" target="_blank"><img src="https://images.opencollective.com/nanabit/d15fd98/logo/256.png?height=80" width="80"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://vital.io/" target="_blank"><img src="https://avatars.githubusercontent.com/u/25357309?s=200" width="80"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://coderabbit.ai/" target="_blank"><img src="https://avatars.githubusercontent.com/u/132028505?s=200&v=4" width="80"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://forge42.dev/" target="_blank"><img src="https://avatars.githubusercontent.com/u/161314831?s=200&v=4" width="80"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://transloadit.com/" target="_blank"><img src="https://avatars.githubusercontent.com/u/125754?s=200&v=4" width="80"></a>
      </td>
    </tr>
  </tbody>
</table>

[biomejs]: https://biomejs.dev/ja/
[biome-philosophy]: https://biomejs.dev/ja/internals/philosophy/
[language-support]: https://biomejs.dev/ja/internals/language-support/
[getting-started]: https://biomejs.dev/ja/guides/getting-started/
