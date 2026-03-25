// @ts-check

import {
  // @ts-ignore
  lazyPostcss,

  // @ts-ignore
  lazyPostcssImport,

  // @ts-ignore
  lazyCssnano,

  // @ts-ignore
  lazyAutoprefixer,
} from '../../../peers/index.js'

/**
 * @returns {import('postcss')}
 */
export function loadPostcss() {
  // Try to load a local `postcss` version first
  try {
    return require('postcss')
  } catch {}

  return lazyPostcss()
}

export function loadPostcssImport() {
  // Try to load a local `postcss-import` version first
  try {
    return require('postcss-import')
  } catch {}

  return lazyPostcssImport()
}

export function loadCssNano() {
  let options = { preset: ['default', { cssDeclarationSorter: false }] }

  // Try to load a local `cssnano` version first
  try {
    return require('cssnano')
  } catch {}

  return lazyCssnano()(options)
}

export function loadAutoprefixer() {
  // Try to load a local `autoprefixer` version first
  try {
    return require('autoprefixer')
  } catch {}

  return lazyAutoprefixer()
}
