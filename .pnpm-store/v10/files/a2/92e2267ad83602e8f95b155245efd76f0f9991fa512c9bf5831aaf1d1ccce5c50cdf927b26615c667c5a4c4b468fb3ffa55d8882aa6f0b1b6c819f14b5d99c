'use strict';

/**
 * Extract the @import/@require statements from a given stylus file's content
 *
 * @param  {String} content
 * @return {String[]}
 */
module.exports = function(content) {
  if (content === undefined) throw new Error('content not given');
  if (typeof content !== 'string') throw new Error('content is not a string');

  const importRegex = /@(?:import|require)\s['"](.*)['"](?:\.styl)?/g;
  const dependencies = [];
  let matches = null;

  do {
    matches = importRegex.exec(content);

    if (matches) {
      dependencies.push(matches[1]);
    }
  } while (matches);

  return dependencies;
};
