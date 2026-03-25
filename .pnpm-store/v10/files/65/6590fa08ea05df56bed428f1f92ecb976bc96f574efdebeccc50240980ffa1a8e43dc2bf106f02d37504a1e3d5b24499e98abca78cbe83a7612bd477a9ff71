// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

import Hook from '../../index.js'
import {
  name1 as n1,
  name2 as n2,
  name3 as n3,
  name4 as n4,
  ClassName as cn,
  generatorFunctionName as gfn,
  name5 as n5,
  bar as n6,
  name7 as n7,
  name8 as n8,
  asyncFunctionName as afn,
  asyncGeneratorFunctionName as agfn,
  arrowFunction as arfn,
  asyncArrowFunction as aarfn
  , functionName
} from '../fixtures/export-types/declarations.mjs'
import { strictEqual } from 'assert'

Hook((exports, name) => {
  if (name.match(/declarations\.m?js/)) {
    exports.name1 += 1
    exports.name2 += 1
    exports.name3 += 1
    exports.name4 += 1
    const orig = exports.functionName
    exports.functionName = function () {
      return orig() + 1
    }
    exports.ClassName.prototype.getFoo = function () {
      return 2
    }
    const orig2 = exports.generatorFunctionName
    exports.generatorFunctionName = function * () {
      return orig2().next().value + 1
    }
    exports.name5 += 1
    exports.bar += 1
    exports.name7 += 1
    exports.name8 += 1
    const asyncOrig = exports.asyncFunctionName
    exports.asyncFunctionName = async function () {
      return await asyncOrig() + 1
    }
    const asyncOrig2 = exports.asyncGeneratorFunctionName
    exports.asyncGeneratorFunctionName = async function * () {
      for await (const value of asyncOrig2()) {
        yield value + 1
      }
    }
    const arrowOrig = exports.arrowFunction
    exports.arrowFunction = () => {
      return arrowOrig() + 1
    }
    const asyncArrowOrig = exports.asyncArrowFunction
    exports.asyncArrowFunction = async () => {
      return await asyncArrowOrig() + 1
    }
  }
})

strictEqual(n1, 2)
strictEqual(n2, 2)
strictEqual(n3, 2)
strictEqual(n4, 2)
strictEqual(functionName(), 2)
/* eslint-disable new-cap */
strictEqual(new cn().getFoo(), 2)
strictEqual(gfn().next().value, 2)
strictEqual(n5, 2)
strictEqual(n6, 2)
strictEqual(n7, 2)
strictEqual(n8, 2)
strictEqual(await afn(), 2)
for await (const value of agfn()) {
  strictEqual(value, 2)
}
strictEqual(arfn(), 2)
strictEqual(await aarfn(), 2)
