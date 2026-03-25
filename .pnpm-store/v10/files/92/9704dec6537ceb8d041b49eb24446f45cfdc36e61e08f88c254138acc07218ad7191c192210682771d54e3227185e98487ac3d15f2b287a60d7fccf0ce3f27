var Z = Object.defineProperty;
var z = (s, t, e) => t in s ? Z(s, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : s[t] = e;
var p = (s, t, e) => z(s, typeof t != "symbol" ? t + "" : t, e);
const $ = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
  m11: 1,
  m12: 0,
  m13: 0,
  m14: 0,
  m21: 0,
  m22: 1,
  m23: 0,
  m24: 0,
  m31: 0,
  m32: 0,
  m33: 1,
  m34: 0,
  m41: 0,
  m42: 0,
  m43: 0,
  m44: 1,
  is2D: !0,
  isIdentity: !0
}, E = (s) => (s instanceof Float64Array || s instanceof Float32Array || Array.isArray(s) && s.every((t) => typeof t == "number")) && [6, 16].some((t) => s.length === t), P = (s) => s instanceof DOMMatrix || s instanceof y || typeof s == "object" && Object.keys($).every((t) => s && t in s), g = (s) => {
  const t = new y(), e = Array.from(s);
  if (!E(e))
    throw TypeError(
      `CSSMatrix: "${e.join(",")}" must be an array with 6/16 numbers.`
    );
  // istanbul ignore else @preserve
  if (e.length === 16) {
    const [
      n,
      i,
      r,
      a,
      l,
      m,
      h,
      c,
      u,
      f,
      w,
      o,
      d,
      A,
      M,
      b
    ] = e;
    t.m11 = n, t.a = n, t.m21 = l, t.c = l, t.m31 = u, t.m41 = d, t.e = d, t.m12 = i, t.b = i, t.m22 = m, t.d = m, t.m32 = f, t.m42 = A, t.f = A, t.m13 = r, t.m23 = h, t.m33 = w, t.m43 = M, t.m14 = a, t.m24 = c, t.m34 = o, t.m44 = b;
  } else if (e.length === 6) {
    const [n, i, r, a, l, m] = e;
    t.m11 = n, t.a = n, t.m12 = i, t.b = i, t.m21 = r, t.c = r, t.m22 = a, t.d = a, t.m41 = l, t.e = l, t.m42 = m, t.f = m;
  }
  return t;
}, X = (s) => {
  if (P(s))
    return g([
      s.m11,
      s.m12,
      s.m13,
      s.m14,
      s.m21,
      s.m22,
      s.m23,
      s.m24,
      s.m31,
      s.m32,
      s.m33,
      s.m34,
      s.m41,
      s.m42,
      s.m43,
      s.m44
    ]);
  throw TypeError(
    `CSSMatrix: "${JSON.stringify(s)}" is not a DOMMatrix / CSSMatrix / JSON compatible object.`
  );
}, O = (s) => {
  if (typeof s != "string")
    throw TypeError(`CSSMatrix: "${JSON.stringify(s)}" is not a string.`);
  const t = String(s).replace(/\s/g, "");
  let e = new y();
  const n = `CSSMatrix: invalid transform string "${s}"`;
  return t.split(")").filter((i) => i).forEach((i) => {
    const [r, a] = i.split("(");
    if (!a) throw TypeError(n);
    const l = a.split(",").map(
      (o) => o.includes("rad") ? parseFloat(o) * (180 / Math.PI) : parseFloat(o)
    ), [m, h, c, u] = l, f = [m, h, c], w = [m, h, c, u];
    if (r === "perspective" && m && [h, c].every((o) => o === void 0))
      e.m34 = -1 / m;
    else if (r.includes("matrix") && [6, 16].includes(l.length) && l.every((o) => !Number.isNaN(+o))) {
      const o = l.map((d) => Math.abs(d) < 1e-6 ? 0 : d);
      e = e.multiply(g(o));
    } else if (r === "translate3d" && f.every((o) => !Number.isNaN(+o)))
      e = e.translate(m, h, c);
    else if (r === "translate" && m && c === void 0)
      e = e.translate(m, h || 0, 0);
    else if (r === "rotate3d" && w.every((o) => !Number.isNaN(+o)) && u)
      e = e.rotateAxisAngle(m, h, c, u);
    else if (r === "rotate" && m && [h, c].every((o) => o === void 0))
      e = e.rotate(0, 0, m);
    else if (r === "scale3d" && f.every((o) => !Number.isNaN(+o)) && f.some((o) => o !== 1))
      e = e.scale(m, h, c);
    else if (
      // prop === "scale" && !Number.isNaN(x) && x !== 1 && z === undefined
      // prop === "scale" && !Number.isNaN(x) && [x, y].some((n) => n !== 1) &&
      r === "scale" && !Number.isNaN(m) && (m !== 1 || h !== 1) && c === void 0
    ) {
      const d = Number.isNaN(+h) ? m : h;
      e = e.scale(m, d, 1);
    } else if (r === "skew" && (m || !Number.isNaN(m) && h) && c === void 0)
      e = e.skew(m, h || 0);
    else if (["translate", "rotate", "scale", "skew"].some(
      (o) => r.includes(o)
    ) && /[XYZ]/.test(r) && m && [h, c].every((o) => o === void 0))
      if (r === "skewX" || r === "skewY")
        e = e[r](m);
      else {
        const o = r.replace(/[XYZ]/, ""), d = r.replace(o, ""), A = ["X", "Y", "Z"].indexOf(d), M = o === "scale" ? 1 : 0, b = [
          A === 0 ? m : M,
          A === 1 ? m : M,
          A === 2 ? m : M
        ];
        e = e[o](...b);
      }
    else
      throw TypeError(n);
  }), e;
}, x = (s, t) => t ? [s.a, s.b, s.c, s.d, s.e, s.f] : [
  s.m11,
  s.m12,
  s.m13,
  s.m14,
  s.m21,
  s.m22,
  s.m23,
  s.m24,
  s.m31,
  s.m32,
  s.m33,
  s.m34,
  s.m41,
  s.m42,
  s.m43,
  s.m44
], Y = (s, t, e) => {
  const n = new y();
  return n.m41 = s, n.e = s, n.m42 = t, n.f = t, n.m43 = e, n;
}, F = (s, t, e) => {
  const n = new y(), i = Math.PI / 180, r = s * i, a = t * i, l = e * i, m = Math.cos(r), h = -Math.sin(r), c = Math.cos(a), u = -Math.sin(a), f = Math.cos(l), w = -Math.sin(l), o = c * f, d = -c * w;
  n.m11 = o, n.a = o, n.m12 = d, n.b = d, n.m13 = u;
  const A = h * u * f + m * w;
  n.m21 = A, n.c = A;
  const M = m * f - h * u * w;
  return n.m22 = M, n.d = M, n.m23 = -h * c, n.m31 = h * w - m * u * f, n.m32 = h * f + m * u * w, n.m33 = m * c, n;
}, T = (s, t, e, n) => {
  const i = new y(), r = Math.sqrt(s * s + t * t + e * e);
  if (r === 0)
    return i;
  const a = s / r, l = t / r, m = e / r, h = n * (Math.PI / 360), c = Math.sin(h), u = Math.cos(h), f = c * c, w = a * a, o = l * l, d = m * m, A = 1 - 2 * (o + d) * f;
  i.m11 = A, i.a = A;
  const M = 2 * (a * l * f + m * c * u);
  i.m12 = M, i.b = M, i.m13 = 2 * (a * m * f - l * c * u);
  const b = 2 * (l * a * f - m * c * u);
  i.m21 = b, i.c = b;
  const k = 1 - 2 * (d + w) * f;
  return i.m22 = k, i.d = k, i.m23 = 2 * (l * m * f + a * c * u), i.m31 = 2 * (m * a * f + l * c * u), i.m32 = 2 * (m * l * f - a * c * u), i.m33 = 1 - 2 * (w + o) * f, i;
}, I = (s, t, e) => {
  const n = new y();
  return n.m11 = s, n.a = s, n.m22 = t, n.d = t, n.m33 = e, n;
}, v = (s, t) => {
  const e = new y();
  if (s) {
    const n = s * Math.PI / 180, i = Math.tan(n);
    e.m21 = i, e.c = i;
  }
  if (t) {
    const n = t * Math.PI / 180, i = Math.tan(n);
    e.m12 = i, e.b = i;
  }
  return e;
}, R = (s) => v(s, 0), D = (s) => v(0, s), N = (s, t) => {
  const e = t.m11 * s.m11 + t.m12 * s.m21 + t.m13 * s.m31 + t.m14 * s.m41, n = t.m11 * s.m12 + t.m12 * s.m22 + t.m13 * s.m32 + t.m14 * s.m42, i = t.m11 * s.m13 + t.m12 * s.m23 + t.m13 * s.m33 + t.m14 * s.m43, r = t.m11 * s.m14 + t.m12 * s.m24 + t.m13 * s.m34 + t.m14 * s.m44, a = t.m21 * s.m11 + t.m22 * s.m21 + t.m23 * s.m31 + t.m24 * s.m41, l = t.m21 * s.m12 + t.m22 * s.m22 + t.m23 * s.m32 + t.m24 * s.m42, m = t.m21 * s.m13 + t.m22 * s.m23 + t.m23 * s.m33 + t.m24 * s.m43, h = t.m21 * s.m14 + t.m22 * s.m24 + t.m23 * s.m34 + t.m24 * s.m44, c = t.m31 * s.m11 + t.m32 * s.m21 + t.m33 * s.m31 + t.m34 * s.m41, u = t.m31 * s.m12 + t.m32 * s.m22 + t.m33 * s.m32 + t.m34 * s.m42, f = t.m31 * s.m13 + t.m32 * s.m23 + t.m33 * s.m33 + t.m34 * s.m43, w = t.m31 * s.m14 + t.m32 * s.m24 + t.m33 * s.m34 + t.m34 * s.m44, o = t.m41 * s.m11 + t.m42 * s.m21 + t.m43 * s.m31 + t.m44 * s.m41, d = t.m41 * s.m12 + t.m42 * s.m22 + t.m43 * s.m32 + t.m44 * s.m42, A = t.m41 * s.m13 + t.m42 * s.m23 + t.m43 * s.m33 + t.m44 * s.m43, M = t.m41 * s.m14 + t.m42 * s.m24 + t.m43 * s.m34 + t.m44 * s.m44;
  return g([
    e,
    n,
    i,
    r,
    a,
    l,
    m,
    h,
    c,
    u,
    f,
    w,
    o,
    d,
    A,
    M
  ]);
};
class y {
  /**
   * @constructor
   * @param init accepts all parameter configurations:
   * * valid CSS transform string,
   * * CSSMatrix/DOMMatrix instance,
   * * a 6/16 elements *Array*.
   */
  constructor(t) {
    return this.a = 1, this.b = 0, this.c = 0, this.d = 1, this.e = 0, this.f = 0, this.m11 = 1, this.m12 = 0, this.m13 = 0, this.m14 = 0, this.m21 = 0, this.m22 = 1, this.m23 = 0, this.m24 = 0, this.m31 = 0, this.m32 = 0, this.m33 = 1, this.m34 = 0, this.m41 = 0, this.m42 = 0, this.m43 = 0, this.m44 = 1, t ? this.setMatrixValue(t) : this;
  }
  /**
   * A `Boolean` whose value is `true` if the matrix is the identity matrix. The identity
   * matrix is one in which every value is 0 except those on the main diagonal from top-left
   * to bottom-right corner (in other words, where the offsets in each direction are equal).
   *
   * @return the current property value
   */
  get isIdentity() {
    return this.m11 === 1 && this.m12 === 0 && this.m13 === 0 && this.m14 === 0 && this.m21 === 0 && this.m22 === 1 && this.m23 === 0 && this.m24 === 0 && this.m31 === 0 && this.m32 === 0 && this.m33 === 1 && this.m34 === 0 && this.m41 === 0 && this.m42 === 0 && this.m43 === 0 && this.m44 === 1;
  }
  /**
   * A `Boolean` flag whose value is `true` if the matrix was initialized as a 2D matrix
   * and `false` if the matrix is 3D.
   *
   * @return the current property value
   */
  get is2D() {
    return this.m31 === 0 && this.m32 === 0 && this.m33 === 1 && this.m34 === 0 && this.m43 === 0 && this.m44 === 1;
  }
  /**
   * The `setMatrixValue` method replaces the existing matrix with one computed
   * in the browser. EG: `matrix(1,0.25,-0.25,1,0,0)`
   *
   * The method accepts any *Array* values, the result of
   * `DOMMatrix` instance method `toFloat64Array()` / `toFloat32Array()` calls
   * or `CSSMatrix` instance method `toArray()`.
   *
   * This method expects valid *matrix()* / *matrix3d()* string values, as well
   * as other transform functions like *translateX(10px)*.
   *
   * @param source
   * @return the matrix instance
   */
  setMatrixValue(t) {
    return typeof t == "string" && t.length && t !== "none" ? O(t) : Array.isArray(t) || t instanceof Float64Array || t instanceof Float32Array ? g(t) : typeof t == "object" ? X(t) : this;
  }
  /**
   * Returns a *Float32Array* containing elements which comprise the matrix.
   * The method can return either the 16 elements or the 6 elements
   * depending on the value of the `is2D` parameter.
   *
   * @param is2D *Array* representation of the matrix
   * @return an *Array* representation of the matrix
   */
  toFloat32Array(t) {
    return Float32Array.from(x(this, t));
  }
  /**
   * Returns a *Float64Array* containing elements which comprise the matrix.
   * The method can return either the 16 elements or the 6 elements
   * depending on the value of the `is2D` parameter.
   *
   * @param is2D *Array* representation of the matrix
   * @return an *Array* representation of the matrix
   */
  toFloat64Array(t) {
    return Float64Array.from(x(this, t));
  }
  /**
   * Creates and returns a string representation of the matrix in `CSS` matrix syntax,
   * using the appropriate `CSS` matrix notation.
   *
   * matrix3d *matrix3d(m11, m12, m13, m14, m21, ...)*
   * matrix *matrix(a, b, c, d, e, f)*
   *
   * @return a string representation of the matrix
   */
  toString() {
    const { is2D: t } = this, e = this.toFloat64Array(t).join(", ");
    return `${t ? "matrix" : "matrix3d"}(${e})`;
  }
  /**
   * Returns a JSON representation of the `CSSMatrix` instance, a standard *Object*
   * that includes `{a,b,c,d,e,f}` and `{m11,m12,m13,..m44}` properties as well
   * as the `is2D` & `isIdentity` properties.
   *
   * The result can also be used as a second parameter for the `fromMatrix` static method
   * to load values into another matrix instance.
   *
   * @return an *Object* with all matrix values.
   */
  toJSON() {
    const { is2D: t, isIdentity: e } = this;
    return { ...this, is2D: t, isIdentity: e };
  }
  /**
   * The Multiply method returns a new CSSMatrix which is the result of this
   * matrix multiplied by the passed matrix, with the passed matrix to the right.
   * This matrix is not modified.
   *
   * @param m2 CSSMatrix
   * @return The resulted matrix.
   */
  multiply(t) {
    return N(this, t);
  }
  /**
   * The translate method returns a new matrix which is this matrix post
   * multiplied by a translation matrix containing the passed values. If the z
   * component is undefined, a 0 value is used in its place. This matrix is not
   * modified.
   *
   * @param x X component of the translation value.
   * @param y Y component of the translation value.
   * @param z Z component of the translation value.
   * @return The resulted matrix
   */
  translate(t, e, n) {
    const i = t;
    let r = e, a = n;
    return typeof r > "u" && (r = 0), typeof a > "u" && (a = 0), N(this, Y(i, r, a));
  }
  /**
   * The scale method returns a new matrix which is this matrix post multiplied by
   * a scale matrix containing the passed values. If the z component is undefined,
   * a 1 value is used in its place. If the y component is undefined, the x
   * component value is used in its place. This matrix is not modified.
   *
   * @param x The X component of the scale value.
   * @param y The Y component of the scale value.
   * @param z The Z component of the scale value.
   * @return The resulted matrix
   */
  scale(t, e, n) {
    const i = t;
    let r = e, a = n;
    return typeof r > "u" && (r = t), typeof a > "u" && (a = 1), N(this, I(i, r, a));
  }
  /**
   * The rotate method returns a new matrix which is this matrix post multiplied
   * by each of 3 rotation matrices about the major axes, first X, then Y, then Z.
   * If the y and z components are undefined, the x value is used to rotate the
   * object about the z axis, as though the vector (0,0,x) were passed. All
   * rotation values are in degrees. This matrix is not modified.
   *
   * @param rx The X component of the rotation, or Z if Y and Z are null.
   * @param ry The (optional) Y component of the rotation value.
   * @param rz The (optional) Z component of the rotation value.
   * @return The resulted matrix
   */
  rotate(t, e, n) {
    let i = t, r = e || 0, a = n || 0;
    return typeof t == "number" && typeof e > "u" && typeof n > "u" && (a = i, i = 0, r = 0), N(this, F(i, r, a));
  }
  /**
   * The rotateAxisAngle method returns a new matrix which is this matrix post
   * multiplied by a rotation matrix with the given axis and `angle`. The right-hand
   * rule is used to determine the direction of rotation. All rotation values are
   * in degrees. This matrix is not modified.
   *
   * @param x The X component of the axis vector.
   * @param y The Y component of the axis vector.
   * @param z The Z component of the axis vector.
   * @param angle The angle of rotation about the axis vector, in degrees.
   * @return The resulted matrix
   */
  rotateAxisAngle(t, e, n, i) {
    if ([t, e, n, i].some((r) => Number.isNaN(+r)))
      throw new TypeError("CSSMatrix: expecting 4 values");
    return N(this, T(t, e, n, i));
  }
  /**
   * Specifies a skew transformation along the `x-axis` by the given angle.
   * This matrix is not modified.
   *
   * @param angle The angle amount in degrees to skew.
   * @return The resulted matrix
   */
  skewX(t) {
    return N(this, R(t));
  }
  /**
   * Specifies a skew transformation along the `y-axis` by the given angle.
   * This matrix is not modified.
   *
   * @param angle The angle amount in degrees to skew.
   * @return The resulted matrix
   */
  skewY(t) {
    return N(this, D(t));
  }
  /**
   * Specifies a skew transformation along both the `x-axis` and `y-axis`.
   * This matrix is not modified.
   *
   * @param angleX The X-angle amount in degrees to skew.
   * @param angleY The angle amount in degrees to skew.
   * @return The resulted matrix
   */
  skew(t, e) {
    return N(this, v(t, e));
  }
  /**
   * Transforms a specified vector using the matrix, returning a new
   * {x,y,z,w} Tuple *Object* comprising the transformed vector.
   * Neither the matrix nor the original vector are altered.
   *
   * The method is equivalent with `transformPoint()` method
   * of the `DOMMatrix` constructor.
   *
   * @param t Tuple with `{x,y,z,w}` components
   * @return the resulting Tuple
   */
  transformPoint(t) {
    const e = this.m11 * t.x + this.m21 * t.y + this.m31 * t.z + this.m41 * t.w, n = this.m12 * t.x + this.m22 * t.y + this.m32 * t.z + this.m42 * t.w, i = this.m13 * t.x + this.m23 * t.y + this.m33 * t.z + this.m43 * t.w, r = this.m14 * t.x + this.m24 * t.y + this.m34 * t.z + this.m44 * t.w;
    return t instanceof DOMPoint ? new DOMPoint(e, n, i, r) : {
      x: e,
      y: n,
      z: i,
      w: r
    };
  }
}
p(y, "Translate", Y), p(y, "Rotate", F), p(y, "RotateAxisAngle", T), p(y, "Scale", I), p(y, "SkewX", R), p(y, "SkewY", D), p(y, "Skew", v), p(y, "Multiply", N), p(y, "fromArray", g), p(y, "fromMatrix", X), p(y, "fromString", O), p(y, "toArray", x), p(y, "isCompatibleArray", E), p(y, "isCompatibleObject", P);
export {
  y as default
};
//# sourceMappingURL=dommatrix.mjs.map
