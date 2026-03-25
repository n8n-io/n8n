import YAMLException = require("../src/exception");

import * as chai from 'chai';
const assert = chai.assert;
import {safeLoad as loadYaml} from '../src/index';
import ast=require("../src/yamlAST");

export interface TestError{
    message: string
    line: number
    column: number
    isWarning:boolean
}

export function testErrors(input:string,expectedErrors: TestError[]) {

    let errorsMap: {[key:string]:boolean} = {};
    for(let e of expectedErrors){
        let key = `${e.message} at line ${e.line} column ${e.column}`;
        if(e.isWarning){
            key += " (warning)";
        }
        errorsMap[key] = true;
    }

    let ast = safeLoad(input);
    if(!ast){
        assert.fail("The parser has failed to load YAML AST");
    }
    let actualErrors = ast.errors;
    if(actualErrors.length==0 && expectedErrors.length==0){
        assert(true);
        return;
    }
    let unexpectedErrorsMap: {[key:string]:YAMLException} = {};
    for(let e of actualErrors){
        let key = `${e.reason} at line ${e.mark.line} column ${e.mark.column}`;
        if(e.isWarning){
            key += " (warning)";
        }
        if(!errorsMap[key]){
            unexpectedErrorsMap[key] = e;
        }
        else{
            delete errorsMap[key];
        }
    }
    let missingErrors = Object.keys(errorsMap);
    let unexpectedErrorKeys = Object.keys(unexpectedErrorsMap);
    if(missingErrors.length==0 && unexpectedErrorKeys.length==0){
        assert(true);
        return;
    }
    let messageComponents:string[] = [];
    if(unexpectedErrorKeys.length>0) {
        messageComponents.push(`Unexpected errors:\n${unexpectedErrorKeys.join('\n')}`);
    }
    if(missingErrors.length>0){
        messageComponents.push(`Missing errors:\n${missingErrors.join('\n')}`);
    }
    let testFailureMessage = `\n${messageComponents.join("\n\n")}`;
    assert(false,testFailureMessage);
};

export function safeLoad(input):ast.YAMLNode {
    return loadYaml(input, {})
}