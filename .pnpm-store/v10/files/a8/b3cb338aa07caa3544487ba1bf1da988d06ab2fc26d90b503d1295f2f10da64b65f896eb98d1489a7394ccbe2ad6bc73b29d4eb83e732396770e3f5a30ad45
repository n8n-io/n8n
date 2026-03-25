const { capitalize } = require('./helpers');
const irregulars = require('./irregular-words');
const rules = require('./rules');

const indefinite = (word, opts = {}) => {
  let article;

  /**
   * I'd really prefer to use for of here, but babel converts that
   * to something using Symbol.iterator, which PhantomJS chokes on.
   */
  rules.some((rule) => {
    if (rule.check(word, opts)) {
      article = rule.run(word, opts);
      return true;
    }
  });

  return handleOptions(article, opts, word);
};

const handleOptions = (article, opts, word) => {
  article = capitalize(article, opts);

  if (opts.articleOnly) {
    return article;
  }

  return `${article} ${word}`;
};

indefinite.irregularWords = irregulars.list;

module.exports = indefinite;
