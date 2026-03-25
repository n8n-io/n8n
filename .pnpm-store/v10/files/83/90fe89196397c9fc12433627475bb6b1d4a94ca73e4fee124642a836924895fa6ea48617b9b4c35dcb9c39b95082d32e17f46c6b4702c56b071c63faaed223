#!/usr/bin/env node
import meow from 'meow'
import browserslistToEsbuild from '../src/index.js'

const cli = meow(
  `
	Usage
	  $ npx browserslist-to-esbuild [browsers]

	Options
  [browsers] Optional browsers string, if not specified defaults to
    the ones specified in the package.json.

	Examples
	  $ npx browserslist-to-esbuild
	  chrome109 edge118 firefox115 ios15.6 opera102 safari15.6

	  $ npx browserslist-to-esbuild '>0.2%, not dead'
	  chrome103 edge87 firefox115 ios12.2 opera102 safari14.1

	  $ npx browserslist-to-esbuild '>0.2%' 'not dead'
	  chrome103 edge87 firefox115 ios12.2 opera102 safari14.1
`,
  {
    importMeta: import.meta,
  }
)

const targets = cli.input.length > 0 ? browserslistToEsbuild(cli.input) : browserslistToEsbuild()

console.log(...targets)
