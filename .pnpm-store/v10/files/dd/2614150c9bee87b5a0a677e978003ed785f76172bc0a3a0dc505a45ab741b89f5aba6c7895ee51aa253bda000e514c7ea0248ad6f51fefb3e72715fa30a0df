'use strict'

const singulars = {
  pronoun: 'it',
  is: 'is',
  was: 'was',
  this: 'this'
}

const plurals = {
  pronoun: 'they',
  is: 'are',
  was: 'were',
  this: 'these'
}

module.exports = class Pluralizer {
  constructor (singular, plural) {
    this.singular = singular
    this.plural = plural
  }

  pluralize (count) {
    const one = count === 1
    const keys = one ? singulars : plurals
    const noun = one ? this.singular : this.plural
    return { ...keys, count, noun }
  }
}
