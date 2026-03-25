/**
 * Run processors
 */
module.exports = function runProcessors(contents, processor, file, count) {

  const processors = Array.isArray(processor) ? processor : [processor];
  const result = {file};

  const newContents = processors.reduce((contents, processor, i) => {
    return processor(contents);
  }, contents);

  result.hasChanged = (newContents !== contents);

  return [result, newContents];
};
