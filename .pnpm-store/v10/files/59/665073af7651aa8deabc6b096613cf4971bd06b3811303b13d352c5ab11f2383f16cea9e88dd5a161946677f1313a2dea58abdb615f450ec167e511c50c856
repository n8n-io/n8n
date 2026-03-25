'use strict';

const detective = require('detective-postcss');

const css = `
  .my_class {
    background: url('myFile.png');
  }`;

// or to also detect any url() references to images, fonts, etc.
const allDependencies = detective(css, { url: true });
