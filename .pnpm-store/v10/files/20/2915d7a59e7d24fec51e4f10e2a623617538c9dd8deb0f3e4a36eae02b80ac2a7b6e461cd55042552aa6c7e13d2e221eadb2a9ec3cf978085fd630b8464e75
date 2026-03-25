<h1 align="center">dedent</h1>

<p align="center">A string tag that strips indentation from multi-line strings. ⬅️</p>

<p align="center">
	<!-- prettier-ignore-start -->
	<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
	<a href="#contributors" target="_blank"><img alt="All Contributors: 18 👪" src="https://img.shields.io/badge/all_contributors-18_👪-21bb42.svg" /></a>
<!-- ALL-CONTRIBUTORS-BADGE:END -->
	<!-- prettier-ignore-end -->
	<a href="https://github.com/dmnd/dedent/blob/main/.github/CODE_OF_CONDUCT.md" target="_blank"><img alt="🤝 Code of Conduct: Kept" src="https://img.shields.io/badge/code_of_conduct-enforced-21bb42" /></a>
	<a href="https://codecov.io/gh/dmnd/dedent" target="_blank"><img alt="🧪 Coverage" src="https://codecov.io/gh/dmnd/dedent/branch/main/graph/badge.svg"/></a>
	<a href="https://github.com/dmnd/dedent/blob/main/LICENSE.md" target="_blank"><img alt="📝 License: MIT" src="https://img.shields.io/github/license/dmnd/dedent?color=21bb42"></a>
	<a href="http://npmjs.com/package/dedent" target="_blank"><img alt="📦 npm version" src="https://img.shields.io/npm/v/dedent?color=21bb42" /></a>
	<img alt="💪 TypeScript: Strict" src="https://img.shields.io/badge/typescript-strict-21bb42.svg" />
</p>

## Usage

```shell
npm i dedent
```

```js
import dedent from "dedent";

function usageExample() {
	const first = dedent`A string that gets so long you need to break it over
											 multiple lines. Luckily dedent is here to keep it
											 readable without lots of spaces ending up in the string
											 itself.`;

	const second = dedent`
		Leading and trailing lines will be trimmed, so you can write something like
		this and have it work as you expect:

			* how convenient it is
			* that I can use an indented list
				 - and still have it do the right thing

		That's all.
	`;

	const third = dedent(`
		Wait! I lied. Dedent can also be used as a function.
	`);

	return first + "\n\n" + second + "\n\n" + third;
}

console.log(usageExample());
```

```plaintext
A string that gets so long you need to break it over
multiple lines. Luckily dedent is here to keep it
readable without lots of spaces ending up in the string
itself.

Leading and trailing lines will be trimmed, so you can write something like
this and have it work as you expect:

	* how convenient it is
	* that I can use an indented list
		- and still have it do the right thing

That's all.

Wait! I lied. Dedent can also be used as a function.
```

## Options

You can customize the options `dedent` runs with by calling its `withOptions` method with an object:

<!-- prettier-ignore -->
```js
import dedent from 'dedent';

dedent.withOptions({ /* ... */ })`input`;
dedent.withOptions({ /* ... */ })(`input`);
```

`options` returns a new `dedent` function, so if you'd like to reuse the same options, you can create a dedicated `dedent` function:

<!-- prettier-ignore -->
```js
import dedent from 'dedent';

const dedenter = dedent.withOptions({ /* ... */ });

dedenter`input`;
dedenter(`input`);
```

### `alignValues`

When an interpolation evaluates to a multi-line string, only its first line is placed where the `${...}` appears. Subsequent lines keep whatever indentation they already had inside that value (often none), so they can appear “shifted left”.

Enable `alignValues` to fix that visual jump. When `true`, for every multi-line interpolated value, each line after the first gets extra indentation appended so it starts in the same column as the first line.

```js
import dedent from "dedent";

const list = dedent`
	- apples
	- bananas
	- cherries
`;

const withoutAlign = dedent`
	List without alignValues (default):
		${list}
	Done.
`;

const withAlign = dedent.withOptions({ alignValues: true })`
	List with alignValues: true
		${list}
	Done.
`;

console.log(withoutAlign);
console.log("---");
console.log(withAlign);
```

```plaintext
List without alignValues (default):
	- apples
- bananas
- cherries
Done.
---
List with alignValues: true
	- apples
	- bananas
	- cherries
Done.
```

### `escapeSpecialCharacters`

JavaScript string tags by default add an extra `\` escape in front of some special characters such as `$` dollar signs.
`dedent` will escape those special characters when called as a string tag.

If you'd like to change the behavior, an `escapeSpecialCharacters` option is available.
It defaults to:

- `false`: when `dedent` is called as a function
- `true`: when `dedent` is called as a string tag

```js
import dedent from "dedent";

// "$hello!"
dedent`
	$hello!
`;

// "\$hello!"
dedent.withOptions({ escapeSpecialCharacters: false })`
	$hello!
`;

// "$hello!"
dedent.withOptions({ escapeSpecialCharacters: true })`
	$hello!
`;
```

For more context, see [🚀 Feature: Add an option to disable special character escaping](https://github.com/dmnd/dedent/issues/63).

### `trimWhitespace`

By default, dedent will trim leading and trailing whitespace from the overall string.

This can be disabled by setting `trimWhitespace: false`.

```js
import dedent from "dedent";

// "hello!"
dedent`
	hello! 
`;

// "\nhello! \n"
dedent.withOptions({ trimWhitespace: false })`
	hello! 
`;

// "hello!"
dedent.withOptions({ trimWhitespace: true })`
	hello! 
`;
```

## License

MIT

## Contributors

<!-- spellchecker: disable -->
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
	<tbody>
		<tr>
			<td align="center" valign="top" width="14.28%"><a href="https://adrianjost.dev/"><img src="https://avatars.githubusercontent.com/u/22987140?v=4?s=100" width="100px;" alt="Adrian Jost"/><br /><sub><b>Adrian Jost</b></sub></a><br /><a href="https://github.com/dmnd/dedent/commits?author=adrianjost" title="Code">💻</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://m811.com/"><img src="https://avatars.githubusercontent.com/u/156837?v=4?s=100" width="100px;" alt="Andri Möll"/><br /><sub><b>Andri Möll</b></sub></a><br /><a href="https://github.com/dmnd/dedent/issues?q=author%3Amoll" title="Bug reports">🐛</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://bennypowers.dev/"><img src="https://avatars.githubusercontent.com/u/1466420?v=4?s=100" width="100px;" alt="Benny Powers - עם ישראל חי!"/><br /><sub><b>Benny Powers - עם ישראל חי!</b></sub></a><br /><a href="#tool-bennypowers" title="Tools">🔧</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://github.com/phenomnomnominal"><img src="https://avatars.githubusercontent.com/u/1086286?v=4?s=100" width="100px;" alt="Craig Spence"/><br /><sub><b>Craig Spence</b></sub></a><br /><a href="https://github.com/dmnd/dedent/commits?author=phenomnomnominal" title="Code">💻</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://synthesis.com/"><img src="https://avatars.githubusercontent.com/u/4427?v=4?s=100" width="100px;" alt="Desmond Brand"/><br /><sub><b>Desmond Brand</b></sub></a><br /><a href="https://github.com/dmnd/dedent/issues?q=author%3Admnd" title="Bug reports">🐛</a> <a href="https://github.com/dmnd/dedent/commits?author=dmnd" title="Code">💻</a> <a href="https://github.com/dmnd/dedent/commits?author=dmnd" title="Documentation">📖</a> <a href="#ideas-dmnd" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-dmnd" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-dmnd" title="Maintenance">🚧</a> <a href="#projectManagement-dmnd" title="Project Management">📆</a> <a href="#tool-dmnd" title="Tools">🔧</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://github.com/G-Rath"><img src="https://avatars.githubusercontent.com/u/3151613?v=4?s=100" width="100px;" alt="Gareth Jones"/><br /><sub><b>Gareth Jones</b></sub></a><br /><a href="https://github.com/dmnd/dedent/commits?author=G-Rath" title="Code">💻</a> <a href="https://github.com/dmnd/dedent/issues?q=author%3AG-Rath" title="Bug reports">🐛</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://github.com/otakustay"><img src="https://avatars.githubusercontent.com/u/639549?v=4?s=100" width="100px;" alt="Gray Zhang"/><br /><sub><b>Gray Zhang</b></sub></a><br /><a href="https://github.com/dmnd/dedent/issues?q=author%3Aotakustay" title="Bug reports">🐛</a></td>
		</tr>
		<tr>
			<td align="center" valign="top" width="14.28%"><a href="https://haroen.me/"><img src="https://avatars.githubusercontent.com/u/6270048?v=4?s=100" width="100px;" alt="Haroen Viaene"/><br /><sub><b>Haroen Viaene</b></sub></a><br /><a href="https://github.com/dmnd/dedent/commits?author=Haroenv" title="Code">💻</a> <a href="#maintenance-Haroenv" title="Maintenance">🚧</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://blog.cometkim.kr/"><img src="https://avatars.githubusercontent.com/u/9696352?v=4?s=100" width="100px;" alt="Hyeseong Kim"/><br /><sub><b>Hyeseong Kim</b></sub></a><br /><a href="#tool-cometkim" title="Tools">🔧</a> <a href="#infra-cometkim" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://github.com/jlarmstrongiv"><img src="https://avatars.githubusercontent.com/u/20903247?v=4?s=100" width="100px;" alt="John L. Armstrong IV"/><br /><sub><b>John L. Armstrong IV</b></sub></a><br /><a href="https://github.com/dmnd/dedent/issues?q=author%3Ajlarmstrongiv" title="Bug reports">🐛</a></td>
			<td align="center" valign="top" width="14.28%"><a href="http://www.joshuakgoldberg.com/"><img src="https://avatars.githubusercontent.com/u/3335181?v=4?s=100" width="100px;" alt="Josh Goldberg ✨"/><br /><sub><b>Josh Goldberg ✨</b></sub></a><br /><a href="https://github.com/dmnd/dedent/issues?q=author%3AJoshuaKGoldberg" title="Bug reports">🐛</a> <a href="https://github.com/dmnd/dedent/commits?author=JoshuaKGoldberg" title="Code">💻</a> <a href="https://github.com/dmnd/dedent/commits?author=JoshuaKGoldberg" title="Documentation">📖</a> <a href="#ideas-JoshuaKGoldberg" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-JoshuaKGoldberg" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-JoshuaKGoldberg" title="Maintenance">🚧</a> <a href="#projectManagement-JoshuaKGoldberg" title="Project Management">📆</a> <a href="#tool-JoshuaKGoldberg" title="Tools">🔧</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://pratapvardhan.com/"><img src="https://avatars.githubusercontent.com/u/3757165?v=4?s=100" width="100px;" alt="Pratap Vardhan"/><br /><sub><b>Pratap Vardhan</b></sub></a><br /><a href="https://github.com/dmnd/dedent/commits?author=pratapvardhan" title="Code">💻</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://github.com/lydell"><img src="https://avatars.githubusercontent.com/u/2142817?v=4?s=100" width="100px;" alt="Simon Lydell"/><br /><sub><b>Simon Lydell</b></sub></a><br /><a href="https://github.com/dmnd/dedent/issues?q=author%3Alydell" title="Bug reports">🐛</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://github.com/yinm"><img src="https://avatars.githubusercontent.com/u/13295106?v=4?s=100" width="100px;" alt="Yusuke Iinuma"/><br /><sub><b>Yusuke Iinuma</b></sub></a><br /><a href="https://github.com/dmnd/dedent/commits?author=yinm" title="Code">💻</a></td>
		</tr>
		<tr>
			<td align="center" valign="top" width="14.28%"><a href="https://github.com/yvele"><img src="https://avatars.githubusercontent.com/u/4225430?v=4?s=100" width="100px;" alt="Yves M."/><br /><sub><b>Yves M.</b></sub></a><br /><a href="#tool-yvele" title="Tools">🔧</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://github.com/d07RiV"><img src="https://avatars.githubusercontent.com/u/3448203?v=4?s=100" width="100px;" alt="d07riv"/><br /><sub><b>d07riv</b></sub></a><br /><a href="https://github.com/dmnd/dedent/issues?q=author%3Ad07RiV" title="Bug reports">🐛</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://mizdra.net/"><img src="https://avatars.githubusercontent.com/u/9639995?v=4?s=100" width="100px;" alt="mizdra"/><br /><sub><b>mizdra</b></sub></a><br /><a href="https://github.com/dmnd/dedent/commits?author=mizdra" title="Code">💻</a></td>
			<td align="center" valign="top" width="14.28%"><a href="https://github.com/sirian"><img src="https://avatars.githubusercontent.com/u/897643?v=4?s=100" width="100px;" alt="sirian"/><br /><sub><b>sirian</b></sub></a><br /><a href="https://github.com/dmnd/dedent/issues?q=author%3Asirian" title="Bug reports">🐛</a></td>
		</tr>
	</tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
<!-- spellchecker: enable -->

> 💙 This package was templated with [create-typescript-app](https://github.com/JoshuaKGoldberg/create-typescript-app).
