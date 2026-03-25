'use strict'
var color = require('console-control-strings').color
var ThemeSet = require('./theme-set.js')

var themes = module.exports = new ThemeSet()

themes.addTheme('ASCII', {
  preProgressbar: '[',
  postProgressbar: ']',
  progressbarTheme: {
    complete: '#',
    remaining: '.',
  },
  activityIndicatorTheme: '-\\|/',
  preSubsection: '>',
})

themes.addTheme('colorASCII', themes.getTheme('ASCII'), {
  progressbarTheme: {
    preComplete: color('bgBrightWhite', 'brightWhite'),
    complete: '#',
    postComplete: color('reset'),
    preRemaining: color('bgBrightBlack', 'brightBlack'),
    remaining: '.',
    postRemaining: color('reset'),
  },
})

themes.addTheme('brailleSpinner', {
  preProgressbar: '(',
  postProgressbar: ')',
  progressbarTheme: {
    complete: '#',
    remaining: '⠂',
  },
  activityIndicatorTheme: '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏',
  preSubsection: '>',
})

themes.addTheme('colorBrailleSpinner', themes.getTheme('brailleSpinner'), {
  progressbarTheme: {
    preComplete: color('bgBrightWhite', 'brightWhite'),
    complete: '#',
    postComplete: color('reset'),
    preRemaining: color('bgBrightBlack', 'brightBlack'),
    remaining: '⠂',
    postRemaining: color('reset'),
  },
})

themes.setDefault({}, 'ASCII')
themes.setDefault({ hasColor: true }, 'colorASCII')
themes.setDefault({ platform: 'darwin', hasUnicode: true }, 'brailleSpinner')
themes.setDefault({ platform: 'darwin', hasUnicode: true, hasColor: true }, 'colorBrailleSpinner')
themes.setDefault({ platform: 'linux', hasUnicode: true }, 'brailleSpinner')
themes.setDefault({ platform: 'linux', hasUnicode: true, hasColor: true }, 'colorBrailleSpinner')
