'use strict';

const claire = require('claire');
const {BitSet} = require('../lib/bitset');

const {
  forAll,
  data: arb,
  label,
  choice,
  transform
} = claire;

const PosInt = transform(Math.floor, arb.Positive);

const EmptyBitSet = label('bitset', transform(
  size => {
    return new BitSet(size);
  },
  choice(arb.Nothing, PosInt)));

suite('BitSet', () => {

test('get bit', forAll(EmptyBitSet, PosInt)
     .satisfy((b, bit) => {
       b.set(bit);
       return b.get(bit);
     }).asTest());

test('clear bit', forAll(EmptyBitSet, PosInt)
     .satisfy((b, bit) => {
       b.set(bit);
       b.clear(bit);
       return !b.get(bit);
     }).asTest());

test('next set of empty', forAll(EmptyBitSet)
     .satisfy(b => {
       return b.nextSetBit(0) === -1;
     }).asTest());

test('next set of one bit', forAll(EmptyBitSet, PosInt)
     .satisfy((b, bit) => {
       b.set(bit);
       return b.nextSetBit(0) === bit;
     }).asTest());

test('next set same bit', forAll(EmptyBitSet, PosInt)
     .satisfy((b, bit) => {
       b.set(bit);
       return b.nextSetBit(bit) === bit;
     }).asTest());

test('next set following bit', forAll(EmptyBitSet, PosInt)
     .satisfy((b, bit) => {
       b.set(bit);
       return b.nextSetBit(bit+1) === -1;
     }).asTest());

test('next clear of empty', forAll(EmptyBitSet, PosInt)
     .satisfy((b, bit) => { return b.nextClearBit(bit) === bit; })
     .asTest());

test('next clear of one set', forAll(EmptyBitSet, PosInt)
     .satisfy((b, bit) => {
       b.set(bit);
       return b.nextClearBit(bit) === bit + 1;
     }).asTest());
});
