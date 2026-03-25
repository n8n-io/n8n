/*
Language: Matlab
Author: Denis Bardadym <bardadymchik@gmail.com>
Contributors: Eugene Nizhibitsky <nizhibitsky@ya.ru>, Egor Rogov <e.rogov@postgrespro.ru>
Website: https://www.mathworks.com/products/matlab.html
Category: scientific
*/

/*
  Formal syntax is not published, helpful link:
  https://github.com/kornilova-l/matlab-IntelliJ-plugin/blob/master/src/main/grammar/Matlab.bnf
*/
function matlab(hljs) {
  const TRANSPOSE_RE = '(\'|\\.\')+';
  const TRANSPOSE = {
    relevance: 0,
    contains: [ { begin: TRANSPOSE_RE } ]
  };

  return {
    name: 'Matlab',
    keywords: {
      keyword:
        'arguments break case catch classdef continue else elseif end enumeration events for function '
        + 'global if methods otherwise parfor persistent properties return spmd switch try while',
      built_in:
        'sin sind sinh asin asind asinh cos cosd cosh acos acosd acosh tan tand tanh atan '
        + 'atand atan2 atanh sec secd sech asec asecd asech csc cscd csch acsc acscd acsch cot '
        + 'cotd coth acot acotd acoth hypot exp expm1 log log1p log10 log2 pow2 realpow reallog '
        + 'realsqrt sqrt nthroot nextpow2 abs angle complex conj imag real unwrap isreal '
        + 'cplxpair fix floor ceil round mod rem sign airy besselj bessely besselh besseli '
        + 'besselk beta betainc betaln ellipj ellipke erf erfc erfcx erfinv expint gamma '
        + 'gammainc gammaln psi legendre cross dot factor isprime primes gcd lcm rat rats perms '
        + 'nchoosek factorial cart2sph cart2pol pol2cart sph2cart hsv2rgb rgb2hsv zeros ones '
        + 'eye repmat rand randn linspace logspace freqspace meshgrid accumarray size length '
        + 'ndims numel disp isempty isequal isequalwithequalnans cat reshape diag blkdiag tril '
        + 'triu fliplr flipud flipdim rot90 find sub2ind ind2sub bsxfun ndgrid permute ipermute '
        + 'shiftdim circshift squeeze isscalar isvector ans eps realmax realmin pi i|0 inf nan '
        + 'isnan isinf isfinite j|0 why compan gallery hadamard hankel hilb invhilb magic pascal '
        + 'rosser toeplitz vander wilkinson max min nanmax nanmin mean nanmean type table '
        + 'readtable writetable sortrows sort figure plot plot3 scatter scatter3 cellfun '
        + 'legend intersect ismember procrustes hold num2cell '
    },
    illegal: '(//|"|#|/\\*|\\s+/\\w+)',
    contains: [
      {
        className: 'function',
        beginKeywords: 'function',
        end: '$',
        contains: [
          hljs.UNDERSCORE_TITLE_MODE,
          {
            className: 'params',
            variants: [
              {
                begin: '\\(',
                end: '\\)'
              },
              {
                begin: '\\[',
                end: '\\]'
              }
            ]
          }
        ]
      },
      {
        className: 'built_in',
        begin: /true|false/,
        relevance: 0,
        starts: TRANSPOSE
      },
      {
        begin: '[a-zA-Z][a-zA-Z_0-9]*' + TRANSPOSE_RE,
        relevance: 0
      },
      {
        className: 'number',
        begin: hljs.C_NUMBER_RE,
        relevance: 0,
        starts: TRANSPOSE
      },
      {
        className: 'string',
        begin: '\'',
        end: '\'',
        contains: [ { begin: '\'\'' } ]
      },
      {
        begin: /\]|\}|\)/,
        relevance: 0,
        starts: TRANSPOSE
      },
      {
        className: 'string',
        begin: '"',
        end: '"',
        contains: [ { begin: '""' } ],
        starts: TRANSPOSE
      },
      hljs.COMMENT('^\\s*%\\{\\s*$', '^\\s*%\\}\\s*$'),
      hljs.COMMENT('%', '$')
    ]
  };
}

module.exports = matlab;
