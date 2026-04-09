const { inspect } = require('util')
/*
 * vendored in order to fix its dependence on the window global [cds 2020/08/04]
 * otherwise unchanged from https://github.com/jarek-foksa/geometry-polyfill/tree/f36bbc8f4bc43539d980687904ce46c8e915543d
 */

// @info
//   DOMPoint polyfill
// @src
//   https://drafts.fxtf.org/geometry/#DOMPoint
//   https://github.com/chromium/chromium/blob/master/third_party/blink/renderer/core/geometry/dom_point_read_only.cc
class DOMPoint {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x
    this.y = y
    this.z = z
    this.w = w
  }

  static fromPoint(otherPoint) {
    return new DOMPoint(
      otherPoint.x,
      otherPoint.y,
      otherPoint.z !== undefined ? otherPoint.z : 0,
      otherPoint.w !== undefined ? otherPoint.w : 1,
    )
  }

  matrixTransform(matrix) {
    if ((matrix.is2D || matrix instanceof SVGMatrix) && this.z === 0 && this.w === 1) {
      return new DOMPoint(
        this.x * matrix.a + this.y * matrix.c + matrix.e,
        this.x * matrix.b + this.y * matrix.d + matrix.f,
        0,
        1,
      )
    } else {
      return new DOMPoint(
        this.x * matrix.m11 + this.y * matrix.m21 + this.z * matrix.m31 + this.w * matrix.m41,
        this.x * matrix.m12 + this.y * matrix.m22 + this.z * matrix.m32 + this.w * matrix.m42,
        this.x * matrix.m13 + this.y * matrix.m23 + this.z * matrix.m33 + this.w * matrix.m43,
        this.x * matrix.m14 + this.y * matrix.m24 + this.z * matrix.m34 + this.w * matrix.m44,
      )
    }
  }

  toJSON() {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      w: this.w,
    }
  }
}

// @info
//   DOMRect polyfill
// @src
//   https://drafts.fxtf.org/geometry/#DOMRect
//   https://github.com/chromium/chromium/blob/master/third_party/blink/renderer/core/geometry/dom_rect_read_only.cc

class DOMRect {
  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  static fromRect(otherRect) {
    return new DOMRect(otherRect.x, otherRect.y, otherRect.width, otherRect.height)
  }

  get top() {
    return this.y
  }

  get left() {
    return this.x
  }

  get right() {
    return this.x + this.width
  }

  get bottom() {
    return this.y + this.height
  }

  toJSON() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      top: this.top,
      left: this.left,
      right: this.right,
      bottom: this.bottom,
    }
  }
}

for (const propertyName of ['top', 'right', 'bottom', 'left']) {
  const propertyDescriptor = Object.getOwnPropertyDescriptor(DOMRect.prototype, propertyName)
  propertyDescriptor.enumerable = true
  Object.defineProperty(DOMRect.prototype, propertyName, propertyDescriptor)
}

// @info
//   DOMMatrix polyfill (SVG 2)
// @src
//   https://github.com/chromium/chromium/blob/master/third_party/blink/renderer/core/geometry/dom_matrix_read_only.cc
//   https://github.com/tocharomera/generativecanvas/blob/master/node-canvas/lib/DOMMatrix.js

const M11 = 0,
  M12 = 1,
  M13 = 2,
  M14 = 3
const M21 = 4,
  M22 = 5,
  M23 = 6,
  M24 = 7
const M31 = 8,
  M32 = 9,
  M33 = 10,
  M34 = 11
const M41 = 12,
  M42 = 13,
  M43 = 14,
  M44 = 15

const A = M11,
  B = M12
const C = M21,
  D = M22
const E = M41,
  F = M42

const DEGREE_PER_RAD = 180 / Math.PI
const RAD_PER_DEGREE = Math.PI / 180

const VALUES = Symbol('values')
const IS_2D = Symbol('is2D')

function parseMatrix(init) {
  let parsed = init.replace(/matrix\(/, '').split(/,/, 7)

  if (parsed.length !== 6) {
    throw new Error(`Failed to parse ${init}`)
  }

  parsed = parsed.map(parseFloat)

  return [parsed[0], parsed[1], 0, 0, parsed[2], parsed[3], 0, 0, 0, 0, 1, 0, parsed[4], parsed[5], 0, 1]
}

function parseMatrix3d(init) {
  const parsed = init.replace(/matrix3d\(/, '').split(/,/, 17)

  if (parsed.length !== 16) {
    throw new Error(`Failed to parse ${init}`)
  }

  return parsed.map(parseFloat)
}

function parseTransform(tform) {
  const type = tform.split(/\(/, 1)[0]

  if (type === 'matrix') {
    return parseMatrix(tform)
  } else if (type === 'matrix3d') {
    return parseMatrix3d(tform)
  } else {
    throw new Error(`${type} parsing not implemented`)
  }
}

const setNumber2D = (receiver, index, value) => {
  if (typeof value !== 'number') {
    throw new TypeError('Expected number')
  }

  receiver[VALUES][index] = value
}

const setNumber3D = (receiver, index, value) => {
  if (typeof value !== 'number') {
    throw new TypeError('Expected number')
  }

  if (index === M33 || index === M44) {
    if (value !== 1) {
      receiver[IS_2D] = false
    }
  } else if (value !== 0) {
    receiver[IS_2D] = false
  }

  receiver[VALUES][index] = value
}

const newInstance = (values) => {
  const instance = Object.create(DOMMatrix.prototype)
  instance.constructor = DOMMatrix
  instance[IS_2D] = true
  instance[VALUES] = values

  return instance
}

const multiply = (first, second) => {
  const dest = new Float64Array(16)

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0

      for (let k = 0; k < 4; k++) {
        sum += first[i * 4 + k] * second[k * 4 + j]
      }

      dest[i * 4 + j] = sum
    }
  }

  return dest
}

class DOMMatrix {
  get m11() {
    return this[VALUES][M11]
  }
  set m11(value) {
    setNumber2D(this, M11, value)
  }
  get m12() {
    return this[VALUES][M12]
  }
  set m12(value) {
    setNumber2D(this, M12, value)
  }
  get m13() {
    return this[VALUES][M13]
  }
  set m13(value) {
    setNumber3D(this, M13, value)
  }
  get m14() {
    return this[VALUES][M14]
  }
  set m14(value) {
    setNumber3D(this, M14, value)
  }
  get m21() {
    return this[VALUES][M21]
  }
  set m21(value) {
    setNumber2D(this, M21, value)
  }
  get m22() {
    return this[VALUES][M22]
  }
  set m22(value) {
    setNumber2D(this, M22, value)
  }
  get m23() {
    return this[VALUES][M23]
  }
  set m23(value) {
    setNumber3D(this, M23, value)
  }
  get m24() {
    return this[VALUES][M24]
  }
  set m24(value) {
    setNumber3D(this, M24, value)
  }
  get m31() {
    return this[VALUES][M31]
  }
  set m31(value) {
    setNumber3D(this, M31, value)
  }
  get m32() {
    return this[VALUES][M32]
  }
  set m32(value) {
    setNumber3D(this, M32, value)
  }
  get m33() {
    return this[VALUES][M33]
  }
  set m33(value) {
    setNumber3D(this, M33, value)
  }
  get m34() {
    return this[VALUES][M34]
  }
  set m34(value) {
    setNumber3D(this, M34, value)
  }
  get m41() {
    return this[VALUES][M41]
  }
  set m41(value) {
    setNumber2D(this, M41, value)
  }
  get m42() {
    return this[VALUES][M42]
  }
  set m42(value) {
    setNumber2D(this, M42, value)
  }
  get m43() {
    return this[VALUES][M43]
  }
  set m43(value) {
    setNumber3D(this, M43, value)
  }
  get m44() {
    return this[VALUES][M44]
  }
  set m44(value) {
    setNumber3D(this, M44, value)
  }

  get a() {
    return this[VALUES][A]
  }
  set a(value) {
    setNumber2D(this, A, value)
  }
  get b() {
    return this[VALUES][B]
  }
  set b(value) {
    setNumber2D(this, B, value)
  }
  get c() {
    return this[VALUES][C]
  }
  set c(value) {
    setNumber2D(this, C, value)
  }
  get d() {
    return this[VALUES][D]
  }
  set d(value) {
    setNumber2D(this, D, value)
  }
  get e() {
    return this[VALUES][E]
  }
  set e(value) {
    setNumber2D(this, E, value)
  }
  get f() {
    return this[VALUES][F]
  }
  set f(value) {
    setNumber2D(this, F, value)
  }

  get is2D() {
    return this[IS_2D]
  }

  get isIdentity() {
    const values = this[VALUES]

    return (
      values[M11] === 1 &&
      values[M12] === 0 &&
      values[M13] === 0 &&
      values[M14] === 0 &&
      values[M21] === 0 &&
      values[M22] === 1 &&
      values[M23] === 0 &&
      values[M24] === 0 &&
      values[M31] === 0 &&
      values[M32] === 0 &&
      values[M33] === 1 &&
      values[M34] === 0 &&
      values[M41] === 0 &&
      values[M42] === 0 &&
      values[M43] === 0 &&
      values[M44] === 1
    )
  }

  static fromMatrix(init) {
    if (init instanceof DOMMatrix) {
      return new DOMMatrix(init[VALUES])
    } else if (init instanceof SVGMatrix) {
      return new DOMMatrix([init.a, init.b, init.c, init.d, init.e, init.f])
    } else {
      throw new TypeError('Expected DOMMatrix')
    }
  }

  static fromFloat32Array(init) {
    if (!(init instanceof Float32Array)) throw new TypeError('Expected Float32Array')
    return new DOMMatrix(init)
  }

  static fromFloat64Array(init) {
    if (!(init instanceof Float64Array)) throw new TypeError('Expected Float64Array')
    return new DOMMatrix(init)
  }

  // @type
  // (Float64Array) => void
  constructor(init) {
    this[IS_2D] = true

    this[VALUES] = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])

    // Parse CSS transformList
    if (typeof init === 'string') {
      if (init === '') {
        return
      } else {
        const tforms = init.split(/\)\s+/, 20).map(parseTransform)

        if (tforms.length === 0) {
          return
        }

        init = tforms[0]

        for (let i = 1; i < tforms.length; i++) {
          init = multiply(tforms[i], init)
        }
      }
    }

    let i = 0

    if (init && init.length === 6) {
      setNumber2D(this, A, init[i++])
      setNumber2D(this, B, init[i++])
      setNumber2D(this, C, init[i++])
      setNumber2D(this, D, init[i++])
      setNumber2D(this, E, init[i++])
      setNumber2D(this, F, init[i++])
    } else if (init && init.length === 16) {
      setNumber2D(this, M11, init[i++])
      setNumber2D(this, M12, init[i++])
      setNumber3D(this, M13, init[i++])
      setNumber3D(this, M14, init[i++])
      setNumber2D(this, M21, init[i++])
      setNumber2D(this, M22, init[i++])
      setNumber3D(this, M23, init[i++])
      setNumber3D(this, M24, init[i++])
      setNumber3D(this, M31, init[i++])
      setNumber3D(this, M32, init[i++])
      setNumber3D(this, M33, init[i++])
      setNumber3D(this, M34, init[i++])
      setNumber2D(this, M41, init[i++])
      setNumber2D(this, M42, init[i++])
      setNumber3D(this, M43, init[i++])
      setNumber3D(this, M44, init[i])
    } else if (init !== undefined) {
      throw new TypeError('Expected string or array.')
    }
  }

  dump() {
    const mat = this[VALUES]
    console.info([mat.slice(0, 4), mat.slice(4, 8), mat.slice(8, 12), mat.slice(12, 16)])
  }

  [inspect.custom](depth) {
    if (depth < 0) return '[DOMMatrix]'

    const { a, b, c, d, e, f, is2D, isIdentity } = this
    if (this.is2D) {
      return `DOMMatrix ${inspect({ a, b, c, d, e, f, is2D, isIdentity }, { colors: true })}`
    } else {
      const { m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44, is2D, isIdentity } = this
      return `DOMMatrix ${inspect(
        {
          a,
          b,
          c,
          d,
          e,
          f,
          m11,
          m12,
          m13,
          m14,
          m21,
          m22,
          m23,
          m24,
          m31,
          m32,
          m33,
          m34,
          m41,
          m42,
          m43,
          m44,
          is2D,
          isIdentity,
        },
        { colors: true },
      )}`
    }
  }

  multiply(other) {
    return newInstance(this[VALUES]).multiplySelf(other)
  }

  multiplySelf(other) {
    this[VALUES] = multiply(other[VALUES], this[VALUES])

    if (!other.is2D) {
      this[IS_2D] = false
    }

    return this
  }

  preMultiplySelf(other) {
    this[VALUES] = multiply(this[VALUES], other[VALUES])

    if (!other.is2D) {
      this[IS_2D] = false
    }

    return this
  }

  translate(tx, ty, tz) {
    return newInstance(this[VALUES]).translateSelf(tx, ty, tz)
  }

  translateSelf(tx = 0, ty = 0, tz = 0) {
    this[VALUES] = multiply([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1], this[VALUES])

    if (tz !== 0) {
      this[IS_2D] = false
    }

    return this
  }

  scale(scaleX, scaleY, scaleZ, originX, originY, originZ) {
    return newInstance(this[VALUES]).scaleSelf(scaleX, scaleY, scaleZ, originX, originY, originZ)
  }

  scale3d(scale, originX, originY, originZ) {
    return newInstance(this[VALUES]).scale3dSelf(scale, originX, originY, originZ)
  }

  scale3dSelf(scale, originX, originY, originZ) {
    return this.scaleSelf(scale, scale, scale, originX, originY, originZ)
  }

  scaleSelf(scaleX, scaleY, scaleZ, originX, originY, originZ) {
    // Not redundant with translate's checks because we need to negate the values later.
    if (typeof originX !== 'number') originX = 0
    if (typeof originY !== 'number') originY = 0
    if (typeof originZ !== 'number') originZ = 0

    this.translateSelf(originX, originY, originZ)

    if (typeof scaleX !== 'number') scaleX = 1
    if (typeof scaleY !== 'number') scaleY = scaleX
    if (typeof scaleZ !== 'number') scaleZ = 1

    this[VALUES] = multiply([scaleX, 0, 0, 0, 0, scaleY, 0, 0, 0, 0, scaleZ, 0, 0, 0, 0, 1], this[VALUES])

    this.translateSelf(-originX, -originY, -originZ)

    if (scaleZ !== 1 || originZ !== 0) {
      this[IS_2D] = false
    }

    return this
  }

  rotateFromVector(x, y) {
    return newInstance(this[VALUES]).rotateFromVectorSelf(x, y)
  }

  rotateFromVectorSelf(x = 0, y = 0) {
    const theta = x === 0 && y === 0 ? 0 : Math.atan2(y, x) * DEGREE_PER_RAD
    return this.rotateSelf(theta)
  }

  rotate(rotX, rotY, rotZ) {
    return newInstance(this[VALUES]).rotateSelf(rotX, rotY, rotZ)
  }

  rotateSelf(rotX, rotY, rotZ) {
    if (rotY === undefined && rotZ === undefined) {
      rotZ = rotX
      rotX = rotY = 0
    }

    if (typeof rotY !== 'number') rotY = 0
    if (typeof rotZ !== 'number') rotZ = 0

    if (rotX !== 0 || rotY !== 0) {
      this[IS_2D] = false
    }

    rotX *= RAD_PER_DEGREE
    rotY *= RAD_PER_DEGREE
    rotZ *= RAD_PER_DEGREE

    let c = Math.cos(rotZ)
    let s = Math.sin(rotZ)

    this[VALUES] = multiply([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], this[VALUES])

    c = Math.cos(rotY)
    s = Math.sin(rotY)

    this[VALUES] = multiply([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1], this[VALUES])

    c = Math.cos(rotX)
    s = Math.sin(rotX)

    this[VALUES] = multiply([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1], this[VALUES])

    return this
  }

  rotateAxisAngle(x, y, z, angle) {
    return newInstance(this[VALUES]).rotateAxisAngleSelf(x, y, z, angle)
  }

  rotateAxisAngleSelf(x = 0, y = 0, z = 0, angle = 0) {
    const length = Math.sqrt(x * x + y * y + z * z)

    if (length === 0) {
      return this
    }

    if (length !== 1) {
      x /= length
      y /= length
      z /= length
    }

    angle *= RAD_PER_DEGREE

    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const t = 1 - c
    const tx = t * x
    const ty = t * y

    this[VALUES] = multiply(
      [
        tx * x + c,
        tx * y + s * z,
        tx * z - s * y,
        0,
        tx * y - s * z,
        ty * y + c,
        ty * z + s * x,
        0,
        tx * z + s * y,
        ty * z - s * x,
        t * z * z + c,
        0,
        0,
        0,
        0,
        1,
      ],
      this[VALUES],
    )

    if (x !== 0 || y !== 0) {
      this[IS_2D] = false
    }

    return this
  }

  skewX(sx) {
    return newInstance(this[VALUES]).skewXSelf(sx)
  }

  skewXSelf(sx) {
    if (typeof sx !== 'number') {
      return this
    }

    const t = Math.tan(sx * RAD_PER_DEGREE)

    this[VALUES] = multiply([1, 0, 0, 0, t, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], this[VALUES])

    return this
  }

  skewY(sy) {
    return newInstance(this[VALUES]).skewYSelf(sy)
  }

  skewYSelf(sy) {
    if (typeof sy !== 'number') {
      return this
    }

    const t = Math.tan(sy * RAD_PER_DEGREE)

    this[VALUES] = multiply([1, t, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], this[VALUES])

    return this
  }

  flipX() {
    return newInstance(multiply([-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], this[VALUES]))
  }

  flipY() {
    return newInstance(multiply([1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], this[VALUES]))
  }

  inverse() {
    return newInstance(this[VALUES].slice()).invertSelf()
  }

  invertSelf() {
    if (this[IS_2D]) {
      const det = this[VALUES][A] * this[VALUES][D] - this[VALUES][B] * this[VALUES][C]

      // Invertable
      if (det !== 0) {
        const newA = this[VALUES][D] / det
        const newB = -this[VALUES][B] / det
        const newC = -this[VALUES][C] / det
        const newD = this[VALUES][A] / det
        const newE = (this[VALUES][C] * this[VALUES][F] - this[VALUES][D] * this[VALUES][E]) / det
        const newF = (this[VALUES][B] * this[VALUES][E] - this[VALUES][A] * this[VALUES][F]) / det

        this.a = newA
        this.b = newB
        this.c = newC
        this.d = newD
        this.e = newE
        this.f = newF

        return this
      }

      // Not invertable
      else {
        this[IS_2D] = false

        this[VALUES] = [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN]

        return this
      }
    } else {
      throw new Error('3D matrix inversion is not implemented.')
    }
  }

  setMatrixValue(transformList) {
    const temp = new DOMMatrix(transformList)

    this[VALUES] = temp[VALUES]
    this[IS_2D] = temp[IS_2D]

    return this
  }

  transformPoint(point) {
    const x = point.x || 0
    const y = point.y || 0
    const z = point.z || 0
    const w = point.w || 1

    const values = this[VALUES]

    const nx = values[M11] * x + values[M21] * y + values[M31] * z + values[M41] * w
    const ny = values[M12] * x + values[M22] * y + values[M32] * z + values[M42] * w
    const nz = values[M13] * x + values[M23] * y + values[M33] * z + values[M43] * w
    const nw = values[M14] * x + values[M24] * y + values[M34] * z + values[M44] * w

    return new DOMPoint(nx, ny, nz, nw)
  }

  toFloat32Array() {
    return Float32Array.from(this[VALUES])
  }

  toFloat64Array() {
    return this[VALUES].slice(0)
  }

  toJSON() {
    return {
      a: this.a,
      b: this.b,
      c: this.c,
      d: this.d,
      e: this.e,
      f: this.f,
      m11: this.m11,
      m12: this.m12,
      m13: this.m13,
      m14: this.m14,
      m21: this.m21,
      m22: this.m22,
      m23: this.m23,
      m24: this.m24,
      m31: this.m31,
      m32: this.m32,
      m33: this.m33,
      m34: this.m34,
      m41: this.m41,
      m42: this.m42,
      m43: this.m43,
      m44: this.m44,
      is2D: this.is2D,
      isIdentity: this.isIdentity,
    }
  }

  toString() {
    if (this.is2D) {
      return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`
    } else {
      return `matrix3d(${this[VALUES].join(', ')})`
    }
  }
}

for (const propertyName of [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'm11',
  'm12',
  'm13',
  'm14',
  'm21',
  'm22',
  'm23',
  'm24',
  'm31',
  'm32',
  'm33',
  'm34',
  'm41',
  'm42',
  'm43',
  'm44',
  'is2D',
  'isIdentity',
]) {
  const propertyDescriptor = Object.getOwnPropertyDescriptor(DOMMatrix.prototype, propertyName)
  propertyDescriptor.enumerable = true
  Object.defineProperty(DOMMatrix.prototype, propertyName, propertyDescriptor)
}

module.exports = { DOMPoint, DOMMatrix, DOMRect }
