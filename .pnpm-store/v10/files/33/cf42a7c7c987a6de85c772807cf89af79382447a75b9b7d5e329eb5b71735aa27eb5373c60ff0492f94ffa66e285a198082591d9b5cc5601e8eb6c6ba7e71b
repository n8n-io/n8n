'use strict'

const { resolve, basename } = require('path')
const { readFileSync } = require('fs')
const FormData = require('form-data')

function getFormData (string) {
  try {
    return JSON.parse(string)
  } catch (error) {
    try {
      const path = resolve(string)
      const data = readFileSync(path, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      throw new Error('Invalid JSON or file where to get form data')
    }
  }
}

module.exports = (options) => {
  const obj = typeof options === 'string' ? getFormData(options) : options
  const form = new FormData()
  for (const key in obj) {
    const type = obj[key] && obj[key].type
    switch (type) {
      case 'file': {
        const path = obj[key] && obj[key].path
        if (!path) {
          throw new Error(`Missing key 'path' in form object for key '${key}'`)
        }
        const opts = obj[key] && obj[key].options
        const buffer = readFileSync(path)
        form.append(key, buffer, Object.assign({}, {
          filename: basename(path)
        }, opts))
        break
      }
      case 'text': {
        const value = obj[key] && obj[key].value
        if (!value) {
          throw new Error(`Missing key 'value' in form object for key '${key}'`)
        }
        form.append(key, value)
        break
      }
      default:
        throw new Error('A \'type\' key with value \'text\' or \'file\' should be specified')
    }
  }
  return form
}
