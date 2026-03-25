// Given a version, figure out what the release channel is so that we can publish to the correct
// channel on npm.
//
// E.g.:
//
//   1.2.3                  -> latest (default)
//   0.0.0-insiders.ffaa88  -> insiders
//   4.1.0-alpha.4          -> alpha

let version =
  process.argv[2] || process.env.npm_package_version || require('../package.json').version

let match = /\d+\.\d+\.\d+-(.*)\.\d+/g.exec(version)
if (match) {
  console.log(match[1])
} else {
  console.log('latest')
}
