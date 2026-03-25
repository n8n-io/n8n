const NUMBERS = /^([0-9,]+)/;
const EIGHT_ELEVEN_EIGHTEEN = /^(11|8|18)/;
const ELEVEN_EIGHTEEN = /^(11|18)/;

exports.check = (word) => NUMBERS.test(word);

exports.run = (word, opts) => {
  let number = word.toString().match(NUMBERS)[1].replace(/,/g, '');
  let article = 'a';

  if (EIGHT_ELEVEN_EIGHTEEN.test(number)) {
    const startsWith11Or18 = ELEVEN_EIGHTEEN.test(number);

    // If the number starts with 11 or 18 and is of length 4,
    // the pronunciation is ambiguous so check opts.numbers to see
    // how to render it. Otherwise, if it starts with 11 or 18
    // and has 2, 5, 8, 11, etc. digits, use 'an.' Finally, if it
    // starts with an 8, use 'an.' For everything else, use 'a.'
    if (startsWith11Or18 && number.length === 4) {
      article = opts.numbers === 'colloquial' ? 'an' : 'a';
    } else if (startsWith11Or18 && (number.length - 2) % 3 === 0) {
      article = 'an';
    } else {
      article = number.startsWith('8') ? 'an' : 'a';
    }
  }

  return article;
};
