// @ts-check

/**
 * @typedef {{type: 'dependency', file: string} | {type: 'dir-dependency', dir: string, glob: string}} Dependency
 */

/**
 *
 * @param {import('../lib/content.js').ContentPath} contentPath
 * @returns {Dependency[]}
 */
export default function parseDependency(contentPath) {
  if (contentPath.ignore) {
    return []
  }

  if (!contentPath.glob) {
    return [
      {
        type: 'dependency',
        file: contentPath.base,
      },
    ]
  }

  if (process.env.ROLLUP_WATCH === 'true') {
    // rollup-plugin-postcss does not support dir-dependency messages
    // but directories can be watched in the same way as files
    return [
      {
        type: 'dependency',
        file: contentPath.base,
      },
    ]
  }

  return [
    {
      type: 'dir-dependency',
      dir: contentPath.base,
      glob: contentPath.glob,
    },
  ]
}
