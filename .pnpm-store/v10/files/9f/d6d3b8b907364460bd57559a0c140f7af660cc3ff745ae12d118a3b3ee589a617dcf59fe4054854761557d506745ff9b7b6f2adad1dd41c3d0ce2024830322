/* eslint max-len: 0 */

describe('brackets', function () {

  var data = { x: 2, str: 'x', JSON: JSON }

  // send 1 or 2 in 'err' to enable internal information
  function render (str, dbg) {
    if (dbg) data._debug_ = 1
    return tmpl(str, data)
  }
  function setBrackets (s) {
    brackets.set(s)
  }
  function resetBrackets () {
    brackets.set('{ }')
  }
  function bracketsPair () {
    return brackets(0) + ' ' + brackets(1)
  }

  // reset brackets to defaults
  after(resetBrackets)
  beforeEach(resetBrackets)
  resetBrackets()

  it('default to { } if setting to undefined, null, or an empty string', function () {
    var ab = [null, '']
    for (var i = 0; i < 3; ++i) {
      setBrackets(ab[i])
      expect(bracketsPair()).to.equal('{ }')
      expect(render('{ x }')).to.equal(2)
    }
  })

  //// custom brackets
  it('single and multi character custom brackets', function () {

    // single character brackets
    brackets.set('[ ]')
    expect(bracketsPair()).to.equal('[ ]')
    expect(render('[ x ]')).to.equal(2)
    expect(render('[ str\\[0\\] ]')).to.equal('x')

    // multi character brackets
    setBrackets('{{ }}')
    expect(bracketsPair()).to.equal('{{ }}')
    expect(render('{{ x }}')).to.equal(2)

    // asymmetric brackets
    setBrackets('${ }')
    expect(bracketsPair()).to.equal('${ }')
    expect(render('${ x }')).to.equal(2)
  })

  describe('using brackets inside expressions', function () {

    it('brackets in expressions can always be escaped', function () {
      expect(render('{ "\\{ 1 \\}" }')).to.equal('{ 1 }')
      expect(render('\\{ 1 }')).to.equal('{ 1 }')
      expect(render('{ "\\}" }')).to.equal('}')
      expect(render('{ "\\{" }')).to.equal('{')
      expect(render('{ \\{\\} }')).to.eql({})
    })

    it('though escaping is optional', function () {
      expect(render('{ JSON.stringify({ x: 5 }) }')).to.equal('{"x":5}')
      expect(render('a{ "b{c}d" }e { "{f{f}}" } g')).to.equal('ab{c}de {f{f}} g')

      // for custom brackets as well
      setBrackets('[ ]')
      expect(render('a[ "b[c]d" ]e [ "[f[f]]" ] g')).to.equal('ab[c]de [f[f]] g')

      setBrackets('{{ }}')
      expect(render('a{{ "b{{c}}d" }}e {{ "{f{{f}}}" }} g')).to.equal('ab{{c}}de {f{{f}}} g')
      expect(render('{{{}}}')).to.eql({})

      setBrackets('{^ ^}')
      expect(render('{^ "x" ^}')).to.equal('x')
      expect(render('{^ /{^}/ ^}').source).to.equal(/{^}/.source)

      setBrackets('[[ ]]')
      expect(render('a[[ "b[[c]]d" ]]e [["[[f[f]]]"]]g[[]]')).to.equal('ab[[c]]de [[f[f]]]g')
    })

  })

  describe('2.2.3', function () {

    it('escaped brackets, some 8 bit, iso-8859-1 characters', function () {
      var vals = [
      // source    brackets(2) + brackets(3)
      //['<% %>',  '<% %>'    ],      // angle brackets unsupported from 2.4
        ['{# #}',  '{# #}'],
        ['[! !]',  '\\[! !\\]'],
        ['·ʃ ʃ',   '·ʃ ʃ'],
        ['{$ $}',  '{\\$ \\$}'],
        ['_( )_',  '_\\( \\)_']
      ]
      var rs, bb, i

      rs = new RegExp('{x}')
      setBrackets('{ }')              // same as defaults
      expect(brackets(rs)).to.be(rs)      // must returns the same object (to.be)
      expect(brackets(0)).to.equal('{')
      expect(brackets(1)).to.equal('}')
      expect(brackets(2)).to.equal('{')
      expect(brackets(3)).to.equal('}')

      for (i = 0; i < vals.length; i++) {
        // set the new brackets pair
        rs = vals[i]
        setBrackets(rs[0])
        bb = rs[0].split(' ')
        rs = rs[1]
        expect(brackets(/{ }/g).source).to.equal(rs)
        expect(brackets(0)).to.equal(bb[0])
        expect(brackets(1)).to.equal(bb[1]); bb = rs.split(' ')
        expect(brackets(2)).to.equal(bb[0])
        expect(brackets(3)).to.equal(bb[1])
      }
    })

    //// Better recognition of nested brackets, escaping is almost unnecessary.
    //// (include escaped version for compatibility)

    describe('escaping is almost unnecessary', function () {

      // ...unless you're doing something very special?
      it('no problem with brackets inside strings', function () {
        //, e.g. { "{" } or { "}" }
        expect(render('a{ "b{" }c')).to.equal('ab{c')
        expect(render('a{ "b\\{" }c')).to.equal('ab{c')
        expect(render('a{ "{b" }c')).to.equal('a{bc')
        expect(render('a{ "\\{b" }c')).to.equal('a{bc')

        expect(render('a{ "b}" }c')).to.equal('ab}c')
        expect(render('a{ "b\\}" }c')).to.equal('ab}c')
        expect(render('a{ "}b" }c')).to.equal('a}bc')
        expect(render('a{ "\\}b" }c')).to.equal('a}bc')

        expect(render('{"{"}')).to.equal('{')
        expect(render('{"\\{"}')).to.equal('{')
        expect(render('{"}"}')).to.equal('}')
        expect(render('{"\\}"}')).to.equal('}')

        expect(render('{{a:"{}}"}}')).to.eql({ a: '{}}' })
        expect(render('{{a:"{\\}\\}"}}')).to.eql({ a: '{}}' })
      })

      it('with custom brackets to "[ ]" (bad idea)', function () {
        setBrackets('[ ]')
        expect(render('[ str[0] ]')).to.be('x')
        expect(render('\\[[ str[0] ]]')).to.be('[x]')
        expect(render('[ [1].pop() ]')).to.be(1)
        expect(render('a,[["b", "c"]],d')).to.be('a,b,c,d')
      })

      it('with custom brackets to "( )" (another bad idea)', function () {
        setBrackets('( )')
        expect(render('(str.charAt(0))')).to.be('x')
        expect(render('\\((str.charAt(0)))')).to.be('(x)')
        expect(render('((1 + 1))')).to.be(2)
        expect(render('a,(("b"),("c")),d')).to.be('a,c,d')
      })

      it('with multi character brackets {{ }}, e.g. on "{{{a:1}}}"', function () {
        setBrackets('{{ }}')
        // note: '{{{\\}}}' generate Parse error, this equals to '{{ {\\} }}'
        expect(render('{{{ a:1 }}}')).to.eql({ a: 1 })
        expect(render('{{{a: {}}}}')).to.eql({ a: {} })
        expect(render('{{{a: {\\}}}}')).to.eql({ a: {} })
        expect(render(' {{{}}}')).to.eql(' [object Object]')
      })

      it('with multi character brackets (( ))', function () {
        setBrackets('(( ))')
        expect(render('((({})))')).to.eql({})
        expect(render('(((("o"))))="o"')).to.be('o="o"')
        expect(render('((( ("o") )))="o"')).to.be('o="o"')
      })

      // - you're using asymmetric custom brackets, e.g.: ${ } instead of { }, [ ], {{ }}, <% %>
      it('with asymmetric brackets, e.g. ${ {a:1} } instead of ${ {a:1\\} }',
        function () {
          setBrackets('${ }')
          expect(render('${ {a:1} }')).to.eql({ a: 1 })
          expect(render('${ {a:1\\} }')).to.eql({ a: 1 })
        })

      it('silly brackets? good luck', function () {
        setBrackets('[ ]]')
        expect(render('a[ "[]]"]]b')).to.be('a[]]b')
        expect(render('[[[]]]]')).to.eql([[]])

        setBrackets('( ))')
        expect(render('a( "b))" ))c')).to.be('ab))c')
        expect(render('a( (("bc))")) ))')).to.be('abc))')
        expect(render('a( ("(((b))") ))c')).to.be('a(((b))c')
        expect(render('a( ("b" + (")c" ))))')).to.be('ab)c')    // test skipBracketedPart()
      })

      it('please find a case when escaping is still needed!', function () {
        //expect(render).withArgs('{ "}" }').to.throwError()
        expect(render('{ "}" }')).to.equal('}')
      })

    })

  })
  // end of brackets 2.2.3


  describe('2.3.x', function () {

    it('don\'t use characters in the set [\\x00-\\x1F<>a-zA-Z0-9\'",;\\]',
      function () {
        expect(setBrackets).withArgs(', ,').to.throwError()
        expect(setBrackets).withArgs('" "').to.throwError()
        expect(setBrackets).withArgs('a[ ]a').to.throwError()
        expect(bracketsPair()).to.be('{ }')
      })

    it('you can\'t use the pretty <% %> anymore', function () {
      expect(setBrackets).withArgs('<% %>').to.throwError()
    })

    it('brackets.array in sync with riot.settings.brackets', function () {
      var
        settings = typeof riot === 'undefined' ? {} : riot.settings,
        str
      brackets.settings = settings

      settings.brackets = '{{ }}'
      str = render('{{ x }} and { x }')
      expect(str).to.be('2 and { x }')

      // restore using riot.settings
      settings.brackets = '{ }'
      str = render('\\{{ x }} and { x }')
      expect(str).to.be('{2} and 2')

      // change again, now with riot.settings
      settings.brackets = '{{ }}'
      str = render('{{ x }} and { x }')
      expect(str).to.be('2 and { x }')

      settings.brackets = undefined
      str = render('\\{{ x }} and { x } ')
      expect(str).to.be('{2} and 2 ')

      resetBrackets()
    })

    it('riot.settings.brackets has immediate effect', function () {
      var
        settings,
        haveRiot
      resetBrackets()

      brackets.settings.brackets = '$ $'
      expect(bracketsPair()).to.be('$ $')

      if (typeof riot !== 'undefined' && riot.settings) {
        expect(riot.settings.brackets).to.be('^ ^')
        riot.settings.brackets = '^ ^'
        expect(brackets.settings.brackets).to.be('^ ^')
        expect(bracketsPair()).to.be('^ ^')
        haveRiot = true
      }

      // reasign brackets.settings

      resetBrackets()
      brackets.settings = settings = {}

      settings.brackets = '^ ^'
      expect(brackets.settings.brackets).to.be('^ ^')
      expect(bracketsPair()).to.be('^ ^')

      brackets.settings.brackets = '$ $'
      expect(settings.brackets).to.be('$ $')
      expect(bracketsPair()).to.be('$ $')

      brackets.settings = null  // reset to {brackets: DEFAULT}

      expect(brackets.settings.brackets).to.be('{ }')
      expect(bracketsPair()).to.be('{ }')

      if (haveRiot)
        brackets.settings = riot.settings
      resetBrackets()
    })

    it('don\'t use internal functions', function () {
      var bp
      setBrackets(null)   //to default

      bp = brackets.array(null)
      expect(bp[0] + bp[1]).to.be('{}')
      expect(bracketsPair()).to.be('{ }')

      bp = brackets.array('~ ~')
      expect(bp[0] + bp[1]).to.be('~~')
      expect(bracketsPair()).to.be('{ }')   // must no change
    })

    describe('brackets.split', function () {

      it('the new kid in the town is a key function', function () {
        var
          str = '<tag att="{ a }" expr1={a<1} expr2={a>2}>\n\\{{body}}\r\n</tag>\n'

        resetBrackets()             // set brackets to default
        var a = brackets.split(str)

        expect(a).to.have.length(9)
        expect(a[1]).to.be(' a ')
        expect(a[3]).to.be('a<1')
        expect(a[5]).to.be('a>2')
        expect(a[6]).to.be('>\n\\{')
        expect(a[7]).to.be('body')
        expect(a[8]).to.be('}\r\n</tag>\n')
      })

      it('serve unescaped template to the tmpl module', function () {
        var
          str = '<tag att="{ a }" expr1={a<1} expr2={a>2}>\n\\{{body}}\r\n</tag>\n'

        resetBrackets()
        var a = brackets.split(str, true)

        expect(a).to.have.length(9)
        expect(a[6]).to.be('>\n{')
      })

      it('handle single or double quotes inside quoted expressions', function () {
        var
          str = '<tag att1="{"a"}" att2={"a"} att3={\'a\'}>\'{\'a\'}\'</tag>'

        resetBrackets()
        var a = brackets.split(str, true)
        var b = a.qblocks

        expect(a).to.have.length(9)
        expect(a[0]).to.be('<tag att1="')
        expect(a[8]).to.be('\'</tag>')

        expect(b).to.have.length(4)
        expect(b[0]).to.be('"a"')
        expect(b[1]).to.be('"a"')
        expect(b[2]).to.be("'a'")
        expect(b[3]).to.be("'a'")
      })

      it('recognizes difficult literal regexes', function () {
        var n, p1 = '<p a="', p2 = '">'
        var atest = [
          [p1, '{5+3/ /}/}',          p2],  // <p a="{a+5/ /}/}">  : regex: /}/  (ok, `5+3/ re` == NaN)
          [p1, '{/[///[]}/}',         p2],  // <p a="{/[///[]}/}"> : regex: /[///[]}/
          [p1, '{/\\/[}\\]]/}',       p2],  // <p a="{/\/[}\]]/}"> : regex: /\/[}\]]/
          [p1, '{x/y}', '', '{x/g}',  p2],  // <p a="{x/y}{x/g}">  : NOT regex: /y}{x/g
          [p1, '{a++/b}', '', '{/i}', p2],  // <p a="{a++/b}{/i}"> : NOT regex: /b}{/i
          [p1, "{''+/b}{/i}",         p2],  // <p a="{''+/b}{/i}"> : regex:     /b}{/i
          [p1, '{a==/b}{/i}',         p2],  // <p a="{a==/b}{/i">  : regex:     /b}{/i
          [p1, '{a=/{}}}}/}',         p2]   // <p a="{a=/{}}}}/">  : regex:     /{}}}}/
        ]
        var qblocks = [
          '/}/',
          '/[///[]}/',
          '/\\/[}\\]]/',
          undefined,
          undefined,
          '/b}{/i',
          '/b}{/i',
          '/{}}}}/',
        ]
        resetBrackets()

        for (n = 0; n < atest.length; ++n) {
          var a, t = atest[n]
          a = brackets.split(t.join(''), 1)
          expect(a).to.have.length(t.length)
          expect(a[0]).to.be(unq(t[0]))
          expect(a.qblocks[0]).to.be(qblocks[n])
          expect(a[2]).to.be(unq(t[2]))
        }

        function unq (s) { return /^{.*}$/.test(s) ? s.slice(1, -1) : s }
      })

    })
    // end of brackets.split

  })
  // end of brackets 2.4 suite

})

describe('regexes', function () {

  it('literal strings with escaped quotes inside (double quotes)', function () {
    var match = ' """\\"" "x" "a\\" "'.match(brackets.R_STRINGS)   // R_STRINGS has global flag

    expect(match).to.have.length(4)
    expect(match[0]).to.be('""')
    expect(match[1]).to.be('"\\""')
    expect(match[2]).to.be('"x"')
    expect(match[3]).to.be('"a\\" "')
  })

  it('literal strings with escaped quotes inside (single quotes)', function () {
    var match = " '''\\'' 'x' 'a\\' '".match(brackets.R_STRINGS)   // R_STRINGS has global flag

    expect(match).to.have.length(4)
    expect(match[0]).to.be("''")
    expect(match[1]).to.be("'\\''")
    expect(match[2]).to.be("'x'")
    expect(match[3]).to.be("'a\\' '")
  })

  it('multiline javascript comments in almost all forms', function () {
    var match = ' /* a *//**/ /*/**/ /*//\n*/ /\\*/**/'.match(brackets.R_MLCOMMS)

    expect(match).to.have.length(5)
    expect(match[0]).to.be('/* a */')
    expect(match[1]).to.be('/**/')
    expect(match[2]).to.be('/*/**/')
    expect(match[3]).to.be('/*//\n*/')
    expect(match[4]).to.be('/**/')
  })

  it('no problema with mixed quoted strings and comments', function () {
    var
      re = new RegExp(brackets.S_QBLOCKS + '|' + brackets.R_MLCOMMS.source, 'g'),
      match = ' /* a */"" /*""*/ "/*\\"*/" \\\'/*2*/\\\'\'\''.match(re)

    expect(match).to.have.length(5)
    expect(match[0]).to.be('/* a */')
    expect(match[1]).to.be('""')
    expect(match[2]).to.be('/*""*/')
    expect(match[3]).to.be('"/*\\"*/"')
    expect(match[4]).to.be("'/*2*/\\\''")   // yes, the match is correct :)
  })

})
