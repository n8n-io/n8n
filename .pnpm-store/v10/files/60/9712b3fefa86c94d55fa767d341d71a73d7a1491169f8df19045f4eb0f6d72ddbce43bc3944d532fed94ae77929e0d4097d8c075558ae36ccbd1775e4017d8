// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2024 Datadog, Inc.

const wt = require('worker_threads')

// Do not want this running on loader thread
if (!wt.isMainThread) return

const filename = process.argv[1]
process.env.IITM_TEST_FILE = filename

const [processMajor, processMinor] = process.versions.node.split('.').map(Number)

const match = filename.match(/v([0-9]+)(?:\.([0-9]+))?(?:-v([0-9]+))?/)

const majorRequirement = match ? match[1] : 0
const minorRequirement = match && match[2]
const majorMax = match ? match[3] : Infinity

if (processMajor < majorRequirement) {
  console.log(`skipping ${filename} as this is Node.js v${processMajor} and test wants v${majorRequirement}`)
  process.exit(0)
}
if (processMajor <= majorRequirement && processMinor < minorRequirement) {
  console.log(`skipping ${filename} as this is Node.js v${processMajor}.${processMinor} and test wants >=v${majorRequirement}.${minorRequirement}`)
  process.exit(0)
}

if (processMajor > majorMax) {
  console.log(`skipping ${filename} as this is Node.js v${processMajor} and test wants <=v${majorMax}`)
  process.exit(0)
}
