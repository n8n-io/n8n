var path = require('path');
var url = require('url');

function rebaseRemoteMap(sourceMap, sourceUri) {
  var sourceDirectory = path.dirname(sourceUri);

  sourceMap.sources = sourceMap.sources.map(function(source) {
    return url.resolve(sourceDirectory, source);
  });

  return sourceMap;
}

module.exports = rebaseRemoteMap;
