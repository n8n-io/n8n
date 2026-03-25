# East Asian Width

Get [East Asian Width](http://www.unicode.org/reports/tr11/) from a character.

'F'(Fullwidth), 'H'(Halfwidth), 'W'(Wide), 'Na'(Narrow), 'A'(Ambiguous) or 'N'(Natural).

Original Code is [東アジアの文字幅 (East Asian Width) の判定 - 中途](http://d.hatena.ne.jp/takenspc/20111126#1322252878).

## Install

    $ npm install eastasianwidth

## Usage

    var eaw = require('eastasianwidth');
    console.log(eaw.eastAsianWidth('￦')) // 'F'
    console.log(eaw.eastAsianWidth('｡')) // 'H'
    console.log(eaw.eastAsianWidth('뀀')) // 'W'
    console.log(eaw.eastAsianWidth('a')) // 'Na'
    console.log(eaw.eastAsianWidth('①')) // 'A'
    console.log(eaw.eastAsianWidth('ف')) // 'N'

    console.log(eaw.characterLength('￦')) // 2
    console.log(eaw.characterLength('｡')) // 1
    console.log(eaw.characterLength('뀀')) // 2
    console.log(eaw.characterLength('a')) // 1
    console.log(eaw.characterLength('①')) // 2
    console.log(eaw.characterLength('ف')) // 1

    console.log(eaw.length('あいうえお')) // 10
    console.log(eaw.length('abcdefg')) // 7
    console.log(eaw.length('￠￦｡ￜㄅ뀀¢⟭a⊙①بف')) // 19
