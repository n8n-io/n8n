/**
 * Copyright (c) 2022 Faker
 *
 * This is a version of the original source code migrated to TypeScript and
 * modified by the Faker team.
 *
 * Check LICENSE for more details on copyright.
 *
 * -----------------------------------------------------------------------------
 *
 * Copyright (c) 2006 Y. Okada
 *
 * This program is a JavaScript version of Mersenne Twister, with concealment
 * and encapsulation in class, an almost straight conversion from the original
 * program, mt19937ar.c, translated by Y. Okada on July 17, 2006, and modified
 * a little at July 20, 2006, but there are not any substantial differences.
 *
 * In this program, procedure descriptions and comments of original source code
 * were not removed.
 *
 * Lines commented with //c// were originally descriptions of c procedure.
 * And a few following lines are appropriate JavaScript descriptions.
 *
 * Lines commented with /* and *\/ are original comments.
 * Lines commented with // are additional comments in this JavaScript version.
 *
 * Before using this version, create at least one instance of
 * MersenneTwister19937 class, and initialize the each state, given below
 * in C comments, of all the instances.
 *
 * -----------------------------------------------------------------------------
 *
 * A C-program for MT19937, with initialization improved 2002/1/26.
 * Coded by Takuji Nishimura and Makoto Matsumoto.
 *
 * Before using, initialize the state by using init_genrand(seed)
 * or init_by_array(init_key, key_length).
 *
 * Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. The names of its contributors may not be used to endorse or promote
 *    products derived from this software without specific prior written
 *    permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
 * OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 *
 * Any feedback is very welcome.
 *   http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/emt.html
 *   email: m-mat @ math.sci.hiroshima-u.ac.jp (remove space)
 */
export default class MersenneTwister19937 {
    private readonly N;
    private readonly M;
    private readonly MATRIX_A;
    private readonly UPPER_MASK;
    private readonly LOWER_MASK;
    private mt;
    private mti;
    /**
     * Returns a 32-bits unsigned integer from an operand to which applied a bit
     * operator.
     *
     * @param n1 number to unsign
     */
    private unsigned32;
    /**
     * Emulates lowerflow of a c 32-bits unsigned integer variable, instead of
     * the operator -. These both arguments must be non-negative integers
     * expressible using unsigned 32 bits.
     *
     * @param n1 dividend
     * @param n2 divisor
     */
    private subtraction32;
    /**
     * Emulates overflow of a c 32-bits unsigned integer variable, instead of the operator +.
     * these both arguments must be non-negative integers expressible using unsigned 32 bits.
     *
     * @param n1 number one for addition
     * @param n2 number two for addition
     */
    private addition32;
    /**
     * Emulates overflow of a c 32-bits unsigned integer variable, instead of the operator *.
     * These both arguments must be non-negative integers expressible using unsigned 32 bits.
     *
     * @param n1 number one for multiplication
     * @param n2 number two for multiplication
     */
    private multiplication32;
    /**
     * Initializes mt[N] with a seed.
     *
     * @param seed the seed to use
     */
    initGenrand(seed: number): void;
    /**
     * Initialize by an array with array-length.
     *
     * @param initKey is the array for initializing keys
     * @param keyLength is its length
     */
    initByArray(initKey: number[], keyLength: number): void;
    private mag01;
    /**
     * Generates a random number on [0,2^32]-interval
     */
    genrandInt32(): number;
    /**
     * Generates a random number on [0,2^32]-interval
     */
    genrandInt31(): number;
    /**
     * Generates a random number on [0,1]-real-interval
     */
    genrandReal1(): number;
    /**
     * Generates a random number on [0,1)-real-interval
     */
    genrandReal2(): number;
    /**
     * Generates a random number on (0,1)-real-interval
     */
    genrandReal3(): number;
    /**
     * Generates a random number on [0,1) with 53-bit resolution
     */
    genrandRes53(): number;
}
