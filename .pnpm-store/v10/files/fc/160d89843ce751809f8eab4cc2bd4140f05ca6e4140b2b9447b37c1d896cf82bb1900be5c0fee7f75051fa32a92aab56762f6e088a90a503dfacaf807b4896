import {expect} from 'chai'
import getSeparator from './get-separator'

describe(`get-separator`, () => {
  it(`should return a : with non win32`, () => {
    expect(getSeparator('foo')).to.equal(':')
  })

  it(`should return a ; with non win32`, () => {
    expect(getSeparator('win32')).to.equal(';')
  })
})

