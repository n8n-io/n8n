// @ts-check

import fs from 'fs'
import LRU from '@alloc/quick-lru'

import hash from '../util/hashConfig'
import resolveConfig from '../public/resolve-config'
import resolveConfigPath from '../util/resolveConfigPath'
import { getContext, getFileModifiedMap } from './setupContextUtils'
import parseDependency from '../util/parseDependency'
import { validateConfig } from '../util/validateConfig.js'
import { parseCandidateFiles, resolvedChangedContent } from './content.js'
import { loadConfig } from '../lib/load-config'
import getModuleDependencies from './getModuleDependencies'

let configPathCache = new LRU({ maxSize: 100 })

let candidateFilesCache = new WeakMap()

function getCandidateFiles(context, tailwindConfig) {
  if (candidateFilesCache.has(context)) {
    return candidateFilesCache.get(context)
  }

  let candidateFiles = parseCandidateFiles(context, tailwindConfig)

  return candidateFilesCache.set(context, candidateFiles).get(context)
}

// Get the config object based on a path
function getTailwindConfig(configOrPath) {
  let userConfigPath = resolveConfigPath(configOrPath)

  if (userConfigPath !== null) {
    let [prevConfig, prevConfigHash, prevDeps, prevModified] =
      configPathCache.get(userConfigPath) || []

    let newDeps = getModuleDependencies(userConfigPath)

    let modified = false
    let newModified = new Map()
    for (let file of newDeps) {
      let time = fs.statSync(file).mtimeMs
      newModified.set(file, time)
      if (!prevModified || !prevModified.has(file) || time > prevModified.get(file)) {
        modified = true
      }
    }

    // It hasn't changed (based on timestamps)
    if (!modified) {
      return [prevConfig, userConfigPath, prevConfigHash, prevDeps]
    }

    // It has changed (based on timestamps), or first run
    for (let file of newDeps) {
      delete require.cache[file]
    }
    let newConfig = validateConfig(resolveConfig(loadConfig(userConfigPath)))
    let newHash = hash(newConfig)
    configPathCache.set(userConfigPath, [newConfig, newHash, newDeps, newModified])
    return [newConfig, userConfigPath, newHash, newDeps]
  }

  // It's a plain object, not a path
  let newConfig = resolveConfig(configOrPath?.config ?? configOrPath ?? {})

  newConfig = validateConfig(newConfig)

  return [newConfig, null, hash(newConfig), []]
}

// DISABLE_TOUCH = TRUE

// Retrieve an existing context from cache if possible (since contexts are unique per
// source path), or set up a new one (including setting up watchers and registering
// plugins) then return it
export default function setupTrackingContext(configOrPath) {
  return ({ tailwindDirectives, registerDependency }) => {
    return (root, result) => {
      let [tailwindConfig, userConfigPath, tailwindConfigHash, configDependencies] =
        getTailwindConfig(configOrPath)

      let contextDependencies = new Set(configDependencies)

      // If there are no @tailwind or @apply rules, we don't consider this CSS
      // file or its dependencies to be dependencies of the context. Can reuse
      // the context even if they change. We may want to think about `@layer`
      // being part of this trigger too, but it's tough because it's impossible
      // for a layer in one file to end up in the actual @tailwind rule in
      // another file since independent sources are effectively isolated.
      if (tailwindDirectives.size > 0) {
        // Add current css file as a context dependencies.
        contextDependencies.add(result.opts.from)

        // Add all css @import dependencies as context dependencies.
        for (let message of result.messages) {
          if (message.type === 'dependency') {
            contextDependencies.add(message.file)
          }
        }
      }

      let [context, , mTimesToCommit] = getContext(
        root,
        result,
        tailwindConfig,
        userConfigPath,
        tailwindConfigHash,
        contextDependencies
      )

      let fileModifiedMap = getFileModifiedMap(context)

      let candidateFiles = getCandidateFiles(context, tailwindConfig)

      // If there are no @tailwind or @apply rules, we don't consider this CSS file or it's
      // dependencies to be dependencies of the context. Can reuse the context even if they change.
      // We may want to think about `@layer` being part of this trigger too, but it's tough
      // because it's impossible for a layer in one file to end up in the actual @tailwind rule
      // in another file since independent sources are effectively isolated.
      if (tailwindDirectives.size > 0) {
        // Add template paths as postcss dependencies.
        for (let contentPath of candidateFiles) {
          for (let dependency of parseDependency(contentPath)) {
            registerDependency(dependency)
          }
        }

        let [changedContent, contentMTimesToCommit] = resolvedChangedContent(
          context,
          candidateFiles,
          fileModifiedMap
        )

        for (let content of changedContent) {
          context.changedContent.push(content)
        }

        // Add the mtimes of the content files to the commit list
        // We can overwrite the existing values because unconditionally
        // This is because:
        // 1. Most of the files here won't be in the map yet
        // 2. If they are that means it's a context dependency
        // and we're reading this after the context. This means
        // that the mtime we just read is strictly >= the context
        // mtime. Unless the user / os is doing something weird
        // in which the mtime would be going backwards. If that
        // happens there's already going to be problems.
        for (let [path, mtime] of contentMTimesToCommit.entries()) {
          mTimesToCommit.set(path, mtime)
        }
      }

      for (let file of configDependencies) {
        registerDependency({ type: 'dependency', file })
      }

      // "commit" the new modified time for all context deps
      // We do this here because we want content tracking to
      // read the "old" mtime even when it's a context dependency.
      for (let [path, mtime] of mTimesToCommit.entries()) {
        fileModifiedMap.set(path, mtime)
      }

      return context
    }
  }
}
