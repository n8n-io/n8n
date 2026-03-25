const fs = require('fs');
const xml2js = require('xml2js');

require('@gouch/to-title-case');

const input = 'iso-4217-list-one.xml';
const outputDataFile = 'data.js';
const outputPublishDateFile = 'iso-4217-publish-date.js';

function ingestEntry(entry) {
  return {
    code: entry.Ccy && entry.Ccy._,
    number: entry.CcyNbr && entry.CcyNbr._,
    digits: (entry.CcyMnrUnts && parseInt(entry.CcyMnrUnts._)) || 0,
    currency: entry.CcyNm && entry.CcyNm._,
    countries: (entry.CtryNm && entry.CtryNm._ && [entry.CtryNm._.toLowerCase().toTitleCase()]) || []
  };
}

function indexByCode(index, c) {
  if (!index[c.code]) {
    index[c.code] = c;
  } else {
    index[c.code].countries = index[c.code].countries.concat(c.countries);
  }
  return index;
}

function compareCurrencyCode(a, b) {
  return a.code.localeCompare(b.code);
}

function ingestEntries(data) {
  const currenciesByCode = data.ISO_4217.CcyTbl.CcyNtry
    .map(ingestEntry)
    .reduce(indexByCode, {});

  const currencies = Object.values(currenciesByCode).filter(function (c) { return !!c.code; });
  currencies.sort(compareCurrencyCode);

  return currencies;
}

function ingestPublishDate(data) {
  return data.ISO_4217.Pblshd;
}

function failOnError(err) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
}

fs.readFile(input, function(err, data) {
  failOnError(err);

  xml2js.parseString(
    data,
    {
      explicitArray: false,  // turn off array wrappers around content
      explicitCharkey: true, // put all content under a key so its easier to parse when there are attributes
      mergeAttrs: true       // lift attributes up so they're easier to parse
    },
    function(err, result) {
      failOnError(err);

      const publishDate = ingestPublishDate(result);
      const countries = ingestEntries(result);

      const preamble = '/*\n' +
        '\tFollows ISO 4217, https://www.iso.org/iso-4217-currency-codes.html\n' +
        '\tSee https://www.currency-iso.org/dam/downloads/lists/list_one.xml\n' +
        '\tData last updated ' + publishDate + '\n' +
        '*/\n\n';

      const dataContent = preamble +
        'module.exports = ' + JSON.stringify(countries, null, '  ') + ';';

      const publishDateContent = preamble +
        'module.exports = ' + JSON.stringify(publishDate, null, '  ') + ';';

      fs.writeFile(outputDataFile, dataContent, function(err) {
        failOnError(err);

        console.log('Ingested ' + input + ' into ' + outputDataFile);
      });

      fs.writeFile(outputPublishDateFile, publishDateContent, function(err) {
        failOnError(err);

        console.log('Wrote publish date to ' + outputPublishDateFile);
      });
  });
});
