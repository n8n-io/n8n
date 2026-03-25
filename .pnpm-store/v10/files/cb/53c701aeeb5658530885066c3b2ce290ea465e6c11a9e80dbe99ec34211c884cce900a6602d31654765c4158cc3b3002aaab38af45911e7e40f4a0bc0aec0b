import chai from 'chai'
import managePath from './index'
import getPathVar from './get-path-var'
import getSeparator from './get-separator'

const expect = chai.expect

chai.use(require('chai-string'))

describe(`manage-path`, () => {
  const path1 = '/usr/other/bin'
  const path2 = '/usr/other2/bin'

  describe(`darwin`, () => {
    common('darwin')
  })

  describe(`win32`, () => {
    common('win32')
  })

  describe(`outliers`, () => {
    it(`should function without a given env or platform`, () => {
      const alter = managePath()
      expect(alter.push(path1)).to.equal(path1)
    })

    it(`should default to process.platform for the platform`, () => {
      const env = {}
      const alter = managePath({env}, {})
      expect(alter.push(path2)).to.equal(path2)
    })

  })


  function common(platform) {
    const pathVar = getPathVar({}, platform)
    const separator = getSeparator(platform)
    const originalPath = `/usr/bin${separator}~/.bin`

    let alter, env
    beforeEach(() => {
      env = {USER: 'lukeskywalker', [pathVar]: originalPath}
      alter = managePath(env, {platform})
    })

    describe(`unshift`, () => {
      addOpTests('unshift')
    })

    describe(`push`, () => {
      addOpTests('push')
    })

    describe(`get`, () => {
      it(`should return the current state of env's PATH variable`, () => {
        const result = alter.get()
        expect(result).to.equal(env[pathVar])
      })
    })

    describe(`restore`, () => {
      it(`should restore the original state of env's PATH variable`, () => {
        const pushedValue = alter.push(path1)
        const result = alter.restore()
        const get = alter.get()
        expect(pushedValue).to.not.equal(result)
        expect(result).to.equal(get)
        expect(result).to.equal(originalPath)
      })
    })

    function addOpTests(op) {
      const reverse = op === 'push'
      it(`should prepend a single path`, () => {
        const result = alter[op](path1)
        let expected = [path1, originalPath]
        if (reverse) {
          expected = expected.reverse()
        }
        expect(result).to.equal(expected.join(separator))
      })

      it(`should prepend multiple paths with rest params`, () => {
        const result = alter[op](path1, path2)
        let expected = [path1, path2, originalPath]
        if (reverse) {
          expected = [originalPath, path1, path2]
        }
        expect(result).to.equal(expected.join(separator))
      })

      it(`should prepend multiple paths as an array`, () => {
        const result = alter[op]([path1, path2])
        let expected = [path1, path2, originalPath]
        if (reverse) {
          expected = [originalPath, path1, path2]
        }
        expect(result).to.equal(expected.join(separator))
      })
    }

  }

})


/*
describe('add-to-path', () => {
  let originalPath
  const pathToAdd = '/foo/bar/.bin'

  beforeEach(() => {
    originalPath = env[PATH]
  })

  describe('platform independent', () => {
    it('should throw an error when passed a non-string', () => {
      expect(() => {
        addToPath()
      }).to.throw(/must pass a non-empty string/ig)
    })

    it('should throw an error when passed an empty string', () => {
      expect(() => {
        addToPath(2)
      }).to.throw(/must pass a non-empty string/ig)
    })

    it('should return a function to restore the path', () => {
      const restorePath = addToPath(pathToAdd)
      expect(env[PATH]).to.startWith(pathToAdd)
      restorePath()
      expect(env[PATH]).to.not.contain(pathToAdd)
    })

    it('should handle the case where there is no pre-existing path', () => {
      delete env[PATH]
      addToPath(pathToAdd)
      expect(env[PATH]).to.equal(pathToAdd)
    })

    it('should handle an array of strings', () => {
      const platform = 'darwin'
      const separator = ':'
      const paths = [pathToAdd, '/bar/foo/.bin']
      addToPath(paths, {platform})
      expect(env[PATH]).to.startWith(paths.join(separator))
    })

    it('should allow you to append to the path', () => {
      addToPath(pathToAdd, {append: true})
      expect(env[PATH]).to.endWith(pathToAdd)
    })
  })

  describe('on darwin platform', () => {
    const platform = 'darwin'
    const separator = ':'

    it('should alter the path to add what is provided', () => {
      expect(addToPath(pathToAdd, {platform}))
      expect(env[PATH]).to.startWith(pathToAdd + separator)
    })
  })

  describe('on win32 platform', () => {
    const platform = 'win32'
    const separator = ';'

    it('should alter the path to add what is provided', () => {
      expect(addToPath(pathToAdd, {platform}))
      expect(env[PATH]).to.startWith(pathToAdd + separator)
    })
  })

  afterEach(() => {
    env[PATH] = originalPath
  })
})

*/
