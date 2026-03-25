import { clone } from './clone'

describe('utils', () => {
  describe('#clone', () => {
    describe('for number', () => {
      it('returns the original entry', () => {
        const original = 1
        let copy = clone(original)
        expect(copy).toEqual(1)
        copy = 2
        expect(original).toEqual(1)
      })
    })

    describe('for string', () => {
      it('returns the original entry', () => {
        const original = 'value'
        let copy = clone(original)
        expect(copy).toEqual('value')
        copy = 'newValue'
        expect(original).toEqual('value')
      })
    })

    describe('for undefined', () => {
      it('returns undefined', () => {
        expect(clone(undefined)).toEqual(undefined)
      })
    })

    describe('for null', () => {
      it('returns null', () => {
        expect(clone(null)).toEqual(null)
      })
    })

    describe('for plain object', () => {
      it('returns a clone of the original entry', () => {
        const original = { a: 1, b: { c: 1, d: { e: 1 } }, f: undefined, g: null }
        const copy = clone(original)
        copy.a = 2
        copy.b.c = 3
        copy.b.d.e = 4
        expect(original).toEqual({ a: 1, b: { c: 1, d: { e: 1 } }, f: undefined, g: null })
        expect(copy).toEqual({ a: 2, b: { c: 3, d: { e: 4 } }, f: undefined, g: null })
      })
    })

    describe('for plain object with mixed entries', () => {
      it('returns a clone of the original entry', () => {
        const original = { a: 1, b: [{ c: 1 }, { c: 2 }, { c: 3 }] }
        const copy = clone(original)
        copy.a = 2
        copy.b[0] = { c: 10 }
        copy.b = [copy.b[0]]
        expect(original).toEqual({ a: 1, b: [{ c: 1 }, { c: 2 }, { c: 3 }] })
        expect(copy).toEqual({ a: 2, b: [{ c: 10 }] })
      })
    })

    describe('for class instance object', () => {
      it('does not return a clone of the original entry', () => {
        class Character {
          public name: string
          constructor({ name }: { name: string }) {
            this.name = name
          }
        }
        const original = new Character({ name: 'Piglet' })
        const copy = clone(original)
        copy.name = 'Tiggr'
        expect(original).toEqual(new Character({ name: 'Tiggr' }))
      })
    })

    describe('for Buffer instance object (and similar)', () => {
      it('does not return a clone of the original entry', () => {
        const original = Buffer.from('piglet')
        const copy = clone(original)
        copy.fill('x')
        expect(original).toEqual(Buffer.from('xxxxxx'))
      })
    })

    describe('for array with mixed entries', () => {
      it('returns a clone of the original entry', () => {
        const original = [{ a: 1, b: [{ c: 1 }, { c: 2 }, { c: 3 }], c: { d: 1 } }]
        const copy = clone(original)
        copy[0].a = 2
        copy[0].b[0].c = 20
        copy[0].c.d = 200
        expect(original).toEqual([{ a: 1, b: [{ c: 1 }, { c: 2 }, { c: 3 }], c: { d: 1 } }])
        expect(copy).toEqual([{ a: 2, b: [{ c: 20 }, { c: 2 }, { c: 3 }], c: { d: 200 } }])
      })
    })
  })
})
