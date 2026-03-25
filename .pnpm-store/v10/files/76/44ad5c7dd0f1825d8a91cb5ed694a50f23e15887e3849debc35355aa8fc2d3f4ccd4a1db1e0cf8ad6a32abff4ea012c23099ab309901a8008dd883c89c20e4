import html from '@rollup/plugin-html'
import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import { createFilter } from '@rollup/pluginutils'
import * as sassImplementation from 'sass'
import sassFunctions from './src/scss/_functions.mjs'
import fs from 'fs'
import path from 'path'

const packageJSON = JSON.parse(fs.readFileSync('package.json'))

const banner =
`/*!
 * ${packageJSON.name} v${packageJSON.version}
 * (c) ${new Date().getUTCFullYear()} ${packageJSON.author.name}
 * @license ${packageJSON.license}
 */`

const octiconsDataJSON = 'node_modules/@primer/octicons/build/data.json'

const octicons = ({ include, exclude, heights = [16, 24] } = {}) => {
  const filter = createFilter([octiconsDataJSON])
  const octiconsFilter = createFilter(include, exclude, false)

  return {
    name: 'octicons-data-json',
    transform (code, id) {
      if (!filter(id)) return

      const data = JSON.parse(code)

      return {
        code: JSON.stringify(Object.assign({}, ...Object.keys(data).filter(key => octiconsFilter(key)).map(key => ({
          [key]: {
            heights: Object.assign({}, ...heights.filter(height => ({}).hasOwnProperty.call(data[key].heights, height)).map(height => ({
              [height]: {
                width: data[key].heights[height].width,
                path: data[key].heights[height].path
              }
            })))
          }
        })))),
        map: { mappings: '' }
      }
    }
  }
}

const sass = ({ include, exclude, extensions = ['.sass', '.scss'] } = {}) => {
  const filter = createFilter(include, exclude)

  return {
    name: 'sass',
    load (id) {
      if (!extensions.includes(path.extname(id)) || !filter(id)) return

      return {
        code: 'export default ' + JSON.stringify(sassImplementation.compile(id, {
          functions: sassFunctions,
          style: process.env.DEBUG ? 'expanded' : 'compressed'
        }).css.toString()),
        map: { mappings: '' }
      }
    }
  }
}

const template = ({ files }) => `<!doctype html><meta charset=utf-8><title>\u200b</title><meta name=robots content=noindex><body>${files.js.map(({ fileName }) => `<script src=${fileName}></script>`).join('')}`

const plugins = [
  resolve(),
  octicons({
    include: [
      'comment-discussion',
      'download',
      'eye',
      'heart',
      'issue-opened',
      'mark-github',
      'package',
      'play',
      'repo-forked',
      'repo-template',
      'star'
    ],
    heights: [16]
  }),
  json({
    include: [octiconsDataJSON],
    indent: '  ',
    namedExports: false,
    preferConst: true
  }),
  json({
    exclude: [octiconsDataJSON],
    indent: '  ',
    namedExports: true,
    preferConst: true
  }),
  sass(),
  replace({
    preventAssignment: true,
    values: {
      const: 'var',
      let: 'var',
      'process.env.NODE_ENV': `'${process.env.NODE_ENV || 'development'}'`,
      'process.env.DEBUG': process.env.DEBUG || false
    }
  })
]

export { plugins }

export default [
  {
    input: 'src/container.js',
    plugins,
    output: [
      {
        format: 'cjs',
        file: 'dist/buttons.common.js',
        banner
      },
      {
        format: 'es',
        file: 'dist/buttons.esm.js',
        banner
      }
    ]
  }, {
    input: 'src/main.js',
    plugins,
    output: [
      {
        format: 'iife',
        file: 'dist/buttons.js',
        banner,
        plugins: [
          process.env.NODE_ENV !== 'production' &&
          html({
            fileName: 'buttons.html',
            template
          })
        ]
      },
      {
        format: 'iife',
        file: 'dist/buttons.min.js',
        banner,
        plugins: [
          terser({
            output: {
              comments: /@preserve|@license|@cc_on/i
            }
          }),
          process.env.NODE_ENV === 'production' &&
          html({
            fileName: 'buttons.html',
            template
          })
        ]
      }
    ]
  }
]
