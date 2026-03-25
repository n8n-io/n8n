const assert = require('assert');
const PDF = require('../');
const fs = require('fs');

// to test another valid pdf file just change this 5 constants.
const PDF_FILE = './test/data/03-invalid.pdf';
const VERSION = 'default';
const PDF_PAGE_COUNT = 5;
const FIST_PAGE_TEXT = '';
const LAST_PAGE_TEXT = '';

//TODO: add extra test cases.
describe(`File:${PDF_FILE} PDF.js Version:${VERSION} ps: should all throw error.`, function() {
    this.timeout(20000);
    let dataBuffer = fs.readFileSync(PDF_FILE);
    it('should pass parse', function() {
        let options = {
            version: VERSION
        };

        return PDF(dataBuffer, options).then(function(data) {
                assert.err("should throw error.");
            })
            .catch(function(err) {
                assert.notEqual(err, null);
                assert.notEqual(err, undefined);
            });
    });

    it('should pass parse with option pagerender:null', function() {
        let options = {
            version: VERSION,
            pagerender: null,
            max: 0
        };

        return PDF(dataBuffer, options).then(function(data) {
            assert.err("should throw error.");
        }).catch(function(err) {
            assert.notEqual(err, null);
            assert.notEqual(err, undefined);
        });
    });


    it('should pass parse with option pagerender:undefined', function() {
        let options = {
            version: VERSION,
            max: 0
        };

        return PDF(dataBuffer, options).then(function(data) {
            assert.err("should throw error.");
        }).catch(function(err) {
            assert.notEqual(err, null);
            assert.notEqual(err, undefined);
        });
    });


    it('should pass parse with option max:-1', function() {
        let options = {
            version: VERSION,
            max: -1
        };

        return PDF(dataBuffer, options).then(function(data) {
            assert.err("should throw error.");
        }).catch(function(err) {
            assert.notEqual(err, null);
            assert.notEqual(err, undefined);
        });
    });


    it(`should pass parse with option max:${PDF_PAGE_COUNT-1}`, function() {
        let options_01 = {
            version: VERSION,
            max: PDF_PAGE_COUNT - 1
        };

        let options_02 = {
            version: VERSION
        };

        return PDF(dataBuffer, options_01).then(function(data) {
            assert.err("should throw error.");
        }).then(function() {
            return PDF(dataBuffer, options_02).then(function(data) {
                assert.err("should throw error.");
            });
        }).catch(function(err) {
            assert.notEqual(err, null);
            assert.notEqual(err, undefined);
        });
    });


    it(`should pass parse with option max:${PDF_PAGE_COUNT-1} & render callback`, function() {
        function render_page(pageData, ret) {
            //check documents https://mozilla.github.io/pdf.js/
            ret.text = ret.text ? ret.text : "";

            let render_options = {
                //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
                normalizeWhitespace: true,
                //do not attempt to combine same line TextItem's. The default value is `false`.
                disableCombineTextItems: false
            }

            return pageData.getTextContent(render_options)
                .then(function(textContent) {
                    let strings = textContent.items.map(item => item.str);
                    let text = strings.join(' ');
                    ret.text = `${ret.text} ${text} \n\n`;
                    return ret.text;
                });
        }

        let options_01 = {
            version: VERSION,
            max: PDF_PAGE_COUNT - 1,
            pagerender: render_page
        };

        let options_02 = {
            version: VERSION
        };

        return PDF(dataBuffer, options_01).then(function(data) {
            assert.err("should throw error.");

        }).then(function() {
            return PDF(dataBuffer, options_02).then(function(data) {
                assert.err("should throw error.");
            });
        }).catch(function(err) {
            assert.notEqual(err, null);
            assert.notEqual(err, undefined);
        });
    });


    it(`should pass parse with option max:${PDF_PAGE_COUNT-1} & render modified callback`, function() {
        function render_page(pageData, ret) {
            //check documents https://mozilla.github.io/pdf.js/
            ret.text = ret.text ? ret.text : "";

            let render_options = {
                //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
                normalizeWhitespace: true,
                //do not attempt to combine same line TextItem's. The default value is `false`.
                disableCombineTextItems: false
            }

            return pageData.getTextContent(render_options)
                .then(function(textContent) {
                    //let strings = textContent.items.map(item => item.str);
                    //let text = strings.join(' ');
                    //ret.text = `${ret.text} ${text} \n\n`;
                    ret.text = 'modified callback';
                    return ret.text;
                });
        }

        let options_01 = {
            version: VERSION,
            max: PDF_PAGE_COUNT - 1,
            pagerender: render_page
        };

        let options_02 = {
            version: VERSION
        };

        return PDF(dataBuffer, options_01).then(function(data) {
            assert.err("should throw error.");

        }).then(function() {
            return PDF(dataBuffer, options_02).then(function(data) {
                assert.err("should throw error.");
            });
        }).catch(function(err) {
            assert.notEqual(err, null);
            assert.notEqual(err, undefined);
        });
    });


});
