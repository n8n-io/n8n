import {expect} from 'chai'
import getPathVar from './get-path-var'

describe('get-path-var', () => {
  it('should provide me with PATH when the platform is not `win32`', () => {
    const env = {PATH: '/usr/bin'}
    const platform = 'darwin'
    expect(getPathVar(env, platform)).to.equal('PATH')
  })

  describe('`win32` platform', () => {
    it('should provide me with `Path` if env does not contain `PATH`', () => {
      const env = {Path: '/usr/bin'}
      const platform = 'win32'
      expect(getPathVar(env, platform)).to.equal('Path')
    })

    it('should provide me with `PATH` when env contains `PATH`', () => {
      const env = {otherThing: '123', PATH: '/usr/bin'}
      const platform = 'win32'
      expect(getPathVar(env, platform)).to.equal('PATH')
    })
  })

})

