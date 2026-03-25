// @ts-check

import fs from 'fs'
import path from 'path'

export function indentRecursive(node, indent = 0) {
  node.each &&
    node.each((child, i) => {
      if (!child.raws.before || !child.raws.before.trim() || child.raws.before.includes('\n')) {
        child.raws.before = `\n${node.type !== 'rule' && i > 0 ? '\n' : ''}${'  '.repeat(indent)}`
      }
      child.raws.after = `\n${'  '.repeat(indent)}`
      indentRecursive(child, indent + 1)
    })
}

export function formatNodes(root) {
  indentRecursive(root)
  if (root.first) {
    root.first.raws.before = ''
  }
}

/**
 * When rapidly saving files atomically a couple of situations can happen:
 * - The file is missing since the external program has deleted it by the time we've gotten around to reading it from the earlier save.
 * - The file is being written to by the external program by the time we're going to read it and is thus treated as busy because a lock is held.
 *
 * To work around this we retry reading the file a handful of times with a delay between each attempt
 *
 * @param {string} path
 * @param {number} tries
 * @returns {Promise<string | undefined>}
 * @throws {Error} If the file is still missing or busy after the specified number of tries
 */
export async function readFileWithRetries(path, tries = 5) {
  for (let n = 0; n <= tries; n++) {
    try {
      return await fs.promises.readFile(path, 'utf8')
    } catch (err) {
      if (n !== tries) {
        if (err.code === 'ENOENT' || err.code === 'EBUSY') {
          await new Promise((resolve) => setTimeout(resolve, 10))

          continue
        }
      }

      throw err
    }
  }
}

export function drainStdin() {
  return new Promise((resolve, reject) => {
    let result = ''
    process.stdin.on('data', (chunk) => {
      result += chunk
    })
    process.stdin.on('end', () => resolve(result))
    process.stdin.on('error', (err) => reject(err))
  })
}

export async function outputFile(file, newContents) {
  try {
    let currentContents = await fs.promises.readFile(file, 'utf8')
    if (currentContents === newContents) {
      return // Skip writing the file
    }
  } catch {}

  // Write the file
  await fs.promises.mkdir(path.dirname(file), { recursive: true })
  await fs.promises.writeFile(file, newContents, 'utf8')
}
