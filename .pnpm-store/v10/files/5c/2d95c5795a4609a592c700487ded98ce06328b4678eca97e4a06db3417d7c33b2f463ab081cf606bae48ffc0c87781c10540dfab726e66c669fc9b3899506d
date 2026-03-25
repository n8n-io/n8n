import { DOMParser as dom, Options as DOMParserOptions } from '@xmldom/xmldom';

// global module configuration
interface Context extends ValidatorContext, DOMParserContext {}

interface ValidatorContext {
  validate?: (xml: string) => Promise<any>;
}

interface DOMParserContext {
  dom: dom;
}

const context: Context = {
  validate: undefined,
  dom: new dom()
};

export function getContext() {
  return context;
}

export function setSchemaValidator(params: ValidatorContext) {

  if (typeof params.validate !== 'function') {
    throw new Error('validate must be a callback function having one argument as xml input');
  }

  // assign the validate function to the context
  context.validate = params.validate;

}

export function setDOMParserOptions(options: DOMParserOptions = {}) {
  context.dom = new dom(options);
}
