declare function factorial(a: number): number;
declare function power(a: number, b: number): number;
declare function sqrt(a: number): number;
declare const exponentialSymbols: {
  symbols: {
    '!': {
      postfix: {
        symbol: '!';
        f: factorial;
        notation: 'postfix';
        precedence: 6;
        rightToLeft: 0;
        argCount: 1;
      };
      symbol: '!';
      regSymbol: '!';
    };
    '^': {
      infix: {
        symbol: '^';
        f: power;
        notation: 'infix';
        precedence: 5;
        rightToLeft: 1;
        argCount: 2;
      };
      symbol: '^';
      regSymbol: '\\^';
    };
    sqrt: {
      func: {
        symbol: 'sqrt';
        f: sqrt;
        notation: 'func';
        precedence: 0;
        rightToLeft: 0;
        argCount: 1;
      };
      symbol: 'sqrt';
      regSymbol: 'sqrt\\b';
    };
  };
};

export default exponentialSymbols;
