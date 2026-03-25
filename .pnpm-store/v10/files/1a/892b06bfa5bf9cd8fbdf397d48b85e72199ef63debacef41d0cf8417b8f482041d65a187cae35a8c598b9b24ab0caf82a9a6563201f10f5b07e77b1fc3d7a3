/**
 * Creates and returns a new `DOMMatrix` compatible instance
 * with equivalent instance.
 *
 * @class CSSMatrix
 *
 * @author thednp <https://github.com/thednp/DOMMatrix/>
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMMatrix
 */
declare class CSSMatrix {
    m11: number;
    m12: number;
    m13: number;
    m14: number;
    m21: number;
    m22: number;
    m23: number;
    m24: number;
    m31: number;
    m32: number;
    m33: number;
    m34: number;
    m41: number;
    m42: number;
    m43: number;
    m44: number;
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    static Translate: (x: number, y: number, z: number) => CSSMatrix;
    static Rotate: (rx: number, ry: number, rz: number) => CSSMatrix;
    static RotateAxisAngle: (x: number, y: number, z: number, alpha: number) => CSSMatrix;
    static Scale: (x: number, y: number, z: number) => CSSMatrix;
    static SkewX: (angle: number) => CSSMatrix;
    static SkewY: (angle: number) => CSSMatrix;
    static Skew: (angleX: number, angleY: number) => CSSMatrix;
    static Multiply: (m1: CSSMatrix | DOMMatrix | JSONMatrix, m2: CSSMatrix | DOMMatrix | JSONMatrix) => CSSMatrix;
    static fromArray: (array: number[] | Float32Array | Float64Array) => CSSMatrix;
    static fromMatrix: (m: CSSMatrix | DOMMatrix | JSONMatrix) => CSSMatrix;
    static fromString: (source: string) => CSSMatrix;
    static toArray: (m: CSSMatrix | DOMMatrix | JSONMatrix, is2D?: boolean) => Matrix | Matrix3d;
    static isCompatibleArray: (array?: unknown) => array is Matrix | Matrix3d | Float32Array | Float64Array;
    static isCompatibleObject: (object?: unknown) => object is CSSMatrix | DOMMatrix | JSONMatrix;
    /**
     * @constructor
     * @param init accepts all parameter configurations:
     * * valid CSS transform string,
     * * CSSMatrix/DOMMatrix instance,
     * * a 6/16 elements *Array*.
     */
    constructor(init?: CSSMatrixInput);
    /**
     * A `Boolean` whose value is `true` if the matrix is the identity matrix. The identity
     * matrix is one in which every value is 0 except those on the main diagonal from top-left
     * to bottom-right corner (in other words, where the offsets in each direction are equal).
     *
     * @return the current property value
     */
    get isIdentity(): boolean;
    /**
     * A `Boolean` flag whose value is `true` if the matrix was initialized as a 2D matrix
     * and `false` if the matrix is 3D.
     *
     * @return the current property value
     */
    get is2D(): boolean;
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
    setMatrixValue(source?: CSSMatrixInput): CSSMatrix;
    /**
     * Returns a *Float32Array* containing elements which comprise the matrix.
     * The method can return either the 16 elements or the 6 elements
     * depending on the value of the `is2D` parameter.
     *
     * @param is2D *Array* representation of the matrix
     * @return an *Array* representation of the matrix
     */
    toFloat32Array(is2D?: boolean): Float32Array;
    /**
     * Returns a *Float64Array* containing elements which comprise the matrix.
     * The method can return either the 16 elements or the 6 elements
     * depending on the value of the `is2D` parameter.
     *
     * @param is2D *Array* representation of the matrix
     * @return an *Array* representation of the matrix
     */
    toFloat64Array(is2D?: boolean): Float64Array;
    /**
     * Creates and returns a string representation of the matrix in `CSS` matrix syntax,
     * using the appropriate `CSS` matrix notation.
     *
     * matrix3d *matrix3d(m11, m12, m13, m14, m21, ...)*
     * matrix *matrix(a, b, c, d, e, f)*
     *
     * @return a string representation of the matrix
     */
    toString(): string;
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
    toJSON(): JSONMatrix;
    /**
     * The Multiply method returns a new CSSMatrix which is the result of this
     * matrix multiplied by the passed matrix, with the passed matrix to the right.
     * This matrix is not modified.
     *
     * @param m2 CSSMatrix
     * @return The resulted matrix.
     */
    multiply(m2: CSSMatrix | DOMMatrix | JSONMatrix): CSSMatrix;
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
    translate(x: number, y?: number, z?: number): CSSMatrix;
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
    scale(x: number, y?: number, z?: number): CSSMatrix;
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
    rotate(rx: number, ry?: number, rz?: number): CSSMatrix;
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
    rotateAxisAngle(x: number, y: number, z: number, angle: number): CSSMatrix;
    /**
     * Specifies a skew transformation along the `x-axis` by the given angle.
     * This matrix is not modified.
     *
     * @param angle The angle amount in degrees to skew.
     * @return The resulted matrix
     */
    skewX(angle: number): CSSMatrix;
    /**
     * Specifies a skew transformation along the `y-axis` by the given angle.
     * This matrix is not modified.
     *
     * @param angle The angle amount in degrees to skew.
     * @return The resulted matrix
     */
    skewY(angle: number): CSSMatrix;
    /**
     * Specifies a skew transformation along both the `x-axis` and `y-axis`.
     * This matrix is not modified.
     *
     * @param angleX The X-angle amount in degrees to skew.
     * @param angleY The angle amount in degrees to skew.
     * @return The resulted matrix
     */
    skew(angleX: number, angleY: number): CSSMatrix;
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
    transformPoint(t: PointTuple | DOMPoint): PointTuple | DOMPoint;
}
export default CSSMatrix;

/** All CSSMatrix compatible initialization values. */
declare type CSSMatrixInput = string | number[] | CSSMatrix | DOMMatrix | JSONMatrix | Float32Array | Float64Array;

/** The result of **CSSMatrix.toJSON()** / **DOMMatrix.toJSON()** instance calls. */
declare interface JSONMatrix {
    m11: number;
    m12: number;
    m13: number;
    m14: number;
    m21: number;
    m22: number;
    m23: number;
    m24: number;
    m31: number;
    m32: number;
    m33: number;
    m34: number;
    m41: number;
    m42: number;
    m43: number;
    m44: number;
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    is2D: boolean;
    isIdentity: boolean;
}

/** An array of 6 numbers representing a 2D matrix. */
declare type Matrix = [number, number, number, number, number, number];

/** An array of 16 numbers representing a 3D matrix. */
declare type Matrix3d = [
number,
number,
number,
number,
number,
number,
number,
number,
number,
number,
number,
number,
number,
number,
number,
number
];

/** A DOMMPoint compatible Tuple. */
declare interface PointTuple {
    x: number;
    y: number;
    z: number;
    w: number;
}

export { }
