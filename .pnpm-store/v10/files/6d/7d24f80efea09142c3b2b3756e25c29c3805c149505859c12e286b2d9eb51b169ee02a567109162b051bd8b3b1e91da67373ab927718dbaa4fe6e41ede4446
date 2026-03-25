/*eslint camelcase: 0, max-len: 0 */
/*global globalVar:true */

globalVar = 5

var data = {
  yes: true,
  no: false,
  str: 'x',
  obj: { val: 2 },
  arr: [2],
  x: 2,
  $a: 0,
  $b: 1,
  esc: '\'\n\\',
  abc: { def: 'abc' },
  fn: function (s) { return ['hi', s].join(' ') },
  _debug_: 0
}

// avoid to output the console errors
function noop() { /* noop */ }

// send 1 or 2 in 'err' to enable internal information
function render (str, dbg) {
  if (dbg) data._debug_ = 1
  return tmpl(str, data)
}

describe('riot-tmpl', function () {

  describe('compiles specs', function () {

    //// return values

    it('expressions always return a raw value', function () {
      expect(render('{ 1 }')).to.equal(1)
      expect(render('{ x }')).to.equal(2)
      expect(render('{ str }')).to.equal(data.str)
      expect(render('{ obj }')).to.equal(data.obj)
      expect(render('{ arr }')).to.equal(data.arr)
      expect(render('{ fn }')).to.equal(data.fn)
      expect(render('{ null }')).to.equal(null)
      expect(render('{ no }')).to.equal(false)
      expect(render('{ yes }')).to.equal(true)
      expect(render('{ $a }')).to.equal(0)
    })

    it('templates always return a string value', function () {
      expect(render('{ 1 } ')).to.equal('1 ')
      expect(render('{ obj } ')).to.equal('[object Object] ')
      expect(render(' { yes }')).to.equal(' true')
    })

    //// empty arguments

    it('empty expressions equal to undefined', function () {
      expect(render()).to.be(undefined)
      expect(render('{}')).to.be(undefined)
      expect(render('{ }')).to.be(undefined)
    })

    it('empty templates equal to empty string', function () {
      expect(render('')).to.equal('')
      expect(render('{ } ')).to.equal(' ')
    })

    //// undefined values

    it('undefined vars are catched in expressions and returns undefined', function () {
      expect(render('{ nonExistingVar }')).to.be(undefined)
      data.parent = undefined
      tmpl.errorHandler = noop
      expect(render('{ parent.some.thing }')).to.be(undefined)
      expect(render('{ !nonExistingVar }')).to.equal(true)
      expect(render('{ nonExistingVar ? "yes" : "no" }')).to.equal('no')
      expect(render('{ !nonExistingVar ? "yes" : "no" }')).to.equal('yes')
      tmpl.errorHandler = null
      delete data.parent
    })

    it('in templates, falsy values result in empty string, except zero and false', function () {
      expect(render(' { nonExistingVar }')).to.equal(' ')
      expect(render(' { no }')).to.equal(' false')
      expect(render(' { $a }')).to.equal(' 0')
      expect(render('{false}')).to.equal(false)
      expect(render(' {false}')).to.equal(' false')
    })

    //// expressions

    it('expressions are just regular JavaScript', function () {
      expect(render('{ obj.val }')).to.be(2)
      expect(render('{ obj["val"] }')).to.be(2)
      expect(render('{ arr[0] }')).to.be(2)
      expect(render('{ arr[0]; }')).to.be(2)
      expect(render('{ arr.pop() }')).to.be(2)
      expect(render('{ fn(str) }')).to.be('hi x')
      expect(render('{ yes && "ok" }')).to.be('ok')
      expect(render('{ no && "ok" }')).to.be(false)
      expect(render('{ false || null || !no && yes }')).to.be(true)
      expect(render('{ !no ? "yes" : "no" }')).to.be('yes')
      expect(render('{ !yes ? "yes" : "no" }')).to.be('no')
      // expect(render('{ /^14/.test(+new Date()) }')).to.be(true)
      expect(render('{ typeof Math.random() }')).to.be('number')
      expect(render('{ fn("there") }')).to.be('hi there')
      expect(render('{ str == "x" }')).to.be(true)
      // debugger
      expect(render('{ /x/.test(str) }')).to.be(true)
      expect(render('{ true ? "a b c" : "foo" }')).to.be('a b c')
      expect(render('{ true ? "a \\"b\\" c" : "foo" }')).to.be('a "b" c')
      expect(render('{ str + " y" + \' z\'}')).to.be('x y z')
      expect(render('{ esc }')).to.be(data.esc)
      expect(render('{ $a }')).to.be(0)
      expect(render('{ $a + $b }')).to.be(1)
      expect(render('{ this.str }')).to.be('x')
    })

    it('global variables are not supported in expressions', function () {
      expect(render('{ globalVar }')).to.be(undefined)
    })

    it('all comments in expressions are stripped from the output (not anymore)', function () {
      expect(render('{ /* comment */ /* as*/ }')).to.be(undefined)
      expect(render('{ 1 /* comment */ + 1 }')).to.equal(2)
      expect(render('{ 1 /* comment */ + 1 } ')).to.equal('2 ')
    })

    //// templates

    it('all expressions are evaluted in template', function () {
      expect(render('{ 1 }{ 1 }')).to.equal('11')
      expect(render('{ 1 }{ 1 } ')).to.equal('11 ')
      expect(render(' { 1 }{ 1 }')).to.equal(' 11')
      expect(render('{ 1 } { 1 }')).to.equal('1 1')
    })

    it('both templates and expressions are new-line-friendly', function () {
      expect(render('\n  { yes \n ? 2 \n : 4} \n')).to.equal('\n  2 \n')
    })

    //// class shorthands

    describe('class shorthands', function () {

      it('names can be single-quoted, double-quoted, unquoted', function () {
        expect(render('{ ok : yes }')).to.equal('ok')
        expect(render('{ "a" : yes, \'b\': yes, c: yes }')).to.equal('a b c')
        expect(render('{ a_b-c3: yes }')).to.equal('a_b-c3')
      })

      it('set multiple cases, test trim', function () {
        expect(render('{ c0: 0, c1: "x", "c2  c2b": str, c3: "", c4: obj }')).to.be('c1 c2 c2b  c4')
        expect(render('{ c0: 0, c1: false, "c2  c2b": "", c3: null, c4: undefined }')).to.be('')
      })

      it('set two classes with one expression', function () {
        expect(render('{ "a b": yes }')).to.equal('a b')
      })

      it('errors in expressions are catched silently', function () {
        tmpl.errorHandler = noop
        expect(render('{ loading: !nonExistingVar.length }')).to.equal('')
        tmpl.errorHandler = null
      })

      it('expressions are just regular JavaScript', function () {
        expect(render('{ a: !no, b: yes }')).to.equal('a b')
        expect(render('{ y: false || null || !no && yes }')).to.equal('y')
        expect(render('{ y: 4 > 2 }')).to.equal('y')
        expect(render('{ y: fn() }')).to.equal('y')
        expect(render('{ y: str == "x" }')).to.equal('y')
        expect(render('{ y: new Date() }')).to.equal('y')
        expect(render('{ y: str[0] }')).to.equal('y')
        expect(render('<div>{ (2+3)/2 }</div>')).to.equal('<div>2.5</div>')
      })

      it('even function calls, objects and arrays are no problem', function () {
        expect(render('{ ok: fn(1, 2) }')).to.equal('ok')
        expect(render('{ ok: fn([1, 2]) }')).to.equal('ok')
        expect(render('{ ok: fn({a: 1, b: 1}) }')).to.equal('ok')
      })

    })

  })

  //// new in tmpl 2.2.3

  describe('2.2.3', function () {

    it('few errors in recognizing complex expressions', function () {
      data.$a = 0
      data.$b = 0
      data.parent = { selectedId: 0 }

      //eslint-disable-next-line no-unused-vars
      data.translate = function (k, v) { return v.value }

      // FIX #784 - The shorthand syntax for class names doesn't support parentheses
      expect(render('{ primary: (parent.selectedId === $a)  }')).to.be('primary')
      // a bit more of complexity. note: using the comma operator requires parentheses
      expect(render('{ ok: ($b++, ($a > 0) || ($b & 1)) }')).to.be('ok')
      // FIX #1916 - Can't access variable without this in riot 2.5
      expect(render("{translate('key', {value: abc.def})}", 1)).to.be('abc')

      delete data.translate
    })

    it('unwrapped keywords void, window and global, in addition to `this`', function () {
      data.$a = 5
      expect(render('{ ' + (typeof window === 'object' ? 'window' : 'global') + ' }')).to.be.a('object')
      expect(Object.keys(render('{ ' + (typeof window === 'object' ? 'window' : 'global') + ' }')).length).to.be(0)

      expect(render('{' + (typeof window === 'object' ? 'window' : 'global') + '.globalVar }')).to.be(undefined)
      expect(render('{ this.$a }')).to.be(5)
      expect(render('{ void 0 }')).to.be(undefined)
      data.Date = Date
      expect(render('{ new Date() }')).to.be.a('object')
      delete data.Date
    })

    //// Better recognition of literal regexps inside template and expressions.
    it('better recognition of literal regexes', function () {
      expect(render('{ /{}\\/\\n/.source }')).to.be('{}\\/\\n')
      expect(render('{ ok: /{}\\/\\n/.test("{}\\/\\n") }')).to.be('ok')
      // handling quotes in regexp is not so complicated :)
      expect(render('{ /"\'/.source }')).to.be('"\'')
      expect(render('{ ok: /"\'/.test("\\"\'") }')).to.be('ok')   // ok: /"'/.test("\"'")
      // html template don't have escape
      expect(render('rex = /"\'/')).to.be('rex = /"\'/')          // rex = /\"\'/
      // no confusion with operators
      data.x = 2
      expect(render('{ 10 /x+10/ 1 }')).to.be(15)
      expect(render('{ x /2+x/ 1 }')).to.be(3)
      expect(render('{ x /2+"abc".search(/c/) }')).to.be(3)
      // in expressions, there's no ASI
      expect(render('{ x\n /2+x/ 1 }')).to.be(3)
    })

    it('in quoted text, only openning riot brackets need to be escaped!', function () {
      expect(render('str = "/\\{}\\/\\n/"')).to.be('str = "/{}\\/\\n/"')
      expect(render('<p str2="\\{foo}">\\{ message }</p>')).to.be('<p str2="{foo}">{ message }</p>')
      expect(render('str="\\\\{foo}"')).to.be('str="\\{foo}"')
    })

    //// Better recognition of comments, including empty ones.
    //// (moved to 2.4, now tmpl does not support comments)

    it('you can include almost anything in quoted shorhand names', function () {
      expect(render('{ "_\u221A": 1 }')).to.be('_\u221A')
      expect(render('{ (this["\u221A"] = 1, this["\u221A"]) }')).to.be(1)
    })

    //// Extra tests

    it('correct handling of quotes', function () {
      expect(render("{filterState==''?'empty':'notempty'}")).to.be('notempty')
      expect(render('{ "House \\"Atrides\\" wins" }')).to.be('House "Atrides" wins')
      expect(render('{ "Leto\'s house" }')).to.be("Leto's house")
      expect(render("In '{ \"Leto\\\\\\\'s house\" }'")).to.be("In 'Leto\\\'s house'")  //« In '{ "Leto\\\'s house" }' » --> In 'Leto\'s house'
      expect(render('In "{ "Leto\'s house" }"')).to.be('In "Leto\'s house"')            //« In "{ "Leto's house" }"    » --> In "Leto's house"
      expect(render('In "{ \'Leto\\\'s house\' }"')).to.be('In "Leto\'s house"')        //« In "{ 'Leto\'s house' }"   » --> In "Leto's house"
    })

    //// Consistency?

    it('main inconsistence between expressions and class shorthands are gone', function () {
      tmpl.errorHandler = noop
      expect(render('{ !nonExistingVar.foo ? "ok" : "" }')).to.equal(undefined) // ok
      expect(render('{ !nonExistingVar.foo ? "ok" : "" } ')).to.equal(' ')      // ok
      expect(render('{ ok: !nonExistingVar.foo }')).to.equal('')                // ok ;)
      tmpl.errorHandler = null
    })

    //// Mac/Win EOL's normalization avoids unexpected results with some editors.
    //// (moved to 2.4, now tmpl don't touch non-expression parts)

    describe('whitespace', function () {

      it('is compacted to a space in expressions', function () {
        // you need see at generated code
        expect(render(' { yes ?\n\t2 : 4} ')).to.be(' 2 ')
        expect(render('{ \t \nyes !== no\r\n }')).to.be(true)
      })

      it('is compacted and trimmed in quoted shorthand names', function () {
        expect(render('{ " \ta\n \r \r\nb\n ": yes }')).to.be('a b')
      })

      it('is preserved in literal javascript strings', function () {
        expect(render('{ "\r\n \n \r" }')).to.be('\r\n \n \r')
        expect(render('{ ok: "\r\n".charCodeAt(0) === 13 }')).to.be('ok')
      })

      it('eols (mac/win) are normalized to unix in html text', function () {
        expect(render('\r\n \n \r \n\r')).to.be('\n \n \n \n\n')
        expect(render('\r\n { \r"\n" } \r\n')).to.be('\n \n \n')
        // ...even in their quoted parts
        expect(render('foo="\r\n \n \r"')).to.be('foo="\n \n \n"')
        expect(render('style="\rtop:0\r\n"')).to.be('style="\ntop:0\n"')
      })

    })

  })
  // end of tmpl 2.2.3

  //// new in tmpl 2.3.0

  describe('2.3.0', function () {

    it('support for 8 bit, ISO-8859-1 charset in shorthand names', function () {
      expect(render('{ neón: 1 }')).to.be('neón')
      expect(render('{ -ä: 1 }')).to.be('-ä')               // '-ä' is a valid class name
      expect(render('{ ä: 1 }')).to.be('ä')
    })

    it('does not wrap global and window object names', function () {
      var gw = typeof window === 'object' ? 'window' : 'global'

      expect(render('{ ' + gw + '.globalVar }')).to.be(undefined)
      data.Date = '{}'
      expect(render('{ +new ' + gw + '.Date() }')).to.be(undefined)
      delete data.Date
    })

    it('unwrapped keywords: Infinity, isFinite, isNaN, Date, RegExp and Math', function () {
      var i, a = ['isFinite', 'isNaN', 'Date', 'RegExp', 'Math']

      data.Infinity = Infinity
      data.isFinite = isFinite
      data.isNaN = isNaN
      data.Date = Date
      data.RegExp = RegExp
      data.Math = Math

      expect(render('{ Infinity }')).to.be.a('number')
      expect(render('{ isFinite(1) }')).to.be(true)
      expect(render('{ isNaN({}) }')).to.be(true)
      expect(render('{ Date.parse }')).to.be.a('function')
      expect(render('{ RegExp.$1 }')).to.be.a('string')
      expect(render('{ Math.floor(0) }')).to.be.a('number')

      for (i = 0; i < a.length; ++i) {
        delete data[a[i]]
      }
    })

    it('Fix riot#2002 issue with the `JS_VARNAME` regex failing in iOS 9.3.0', function () {
      data.t = function (s, o) { return s.replace('__storeCount__', o.storeCount) }
      data.storeCount = 1
      var result = render("{ t('Please choose from the __storeCount__ stores available', {storeCount: this.storeCount}) }", 1)

      expect(result).to.be('Please choose from the 1 stores available')
      delete data.t
      delete data.storeCount
    })

    describe('support for comments has been dropped', function () {
      // comments within expresions are converted to spaces, in concordance with js specs
      it('if included, the expression may work, but...', function () {
        expect(render('{ typeof/**/str === "string" }')).to.be(true)
        expect(render('{ 1+/* */+2 }')).to.be(3)

        // comments in template text is preserved
        expect(render(' /*/* *\/ /**/ ')).to.be(' /*/* *\/ /**/ ')
        expect(render('/*/* "note" /**/')).to.be('/*/* "note" /**/')

        // riot parse correctamente empty and exotic comments
        expect(render('{ /**/ }')).to.be(undefined)               // empty comment
        expect(render('{ /*/* *\/ /**/ }')).to.be(undefined)      // nested comment sequences
        expect(render('{ /*dummy*/ }')).to.be(undefined)

        // there's no problem in shorthands
        expect(render('{ ok: 0+ /*{no: 1}*/ 1 }')).to.be('ok')

        // nor in the template text, comments inside strings are preserved
        expect(render('{ "/* ok */" }')).to.be('/* ok */')
        expect(render('{ "/*/* *\/ /**/" }')).to.be('/*/* *\/ /**/')
        expect(render('{ "/* \\"comment\\" */" }')).to.be('/* "comment" */')
      })

      it('something like `{ ok:1 /*,no:1*/ } give incorrect result ("no")', function () {
        expect(render('{ ok: 1 /*, no: 1*/ }')).to.be('no')
      })

      it('others can break your application, e.g. { ok/**/: 1 }', function () {
        expect(render).withArgs('{ ok/**/: 1 }').to.throwError()
        expect(render).withArgs(' { /* comment */ }').to.throwError()
      })
    })

    //// error handler

    describe('catch errors in expressions with tmpl.errorHandler', function () {
      var clearHandler = function () { tmpl.errorHandler = null }

      beforeEach(clearHandler)
      afterEach(clearHandler)
      after(clearHandler)

      it('using a custom function', function () {
        var err

        tmpl.errorHandler = function (e) { err = e }
        // je, tmpl({x}, NaN) does not generate error... bug or danling var?
        //console.error('========== >>>> x: ' + x)        // error here
        //console.error('========== >>>> x: ' + global.x) // undefined here
        err = 0
        expect(tmpl('{x[0]}'), {}).to.be(undefined)       // empty data
        expect(err instanceof Error).to.be(true)
        expect(err.riotData).to.eql({ tagName: undefined, _riot_id: undefined })
        // undefined as parameter for Function.call(`this`) defaults to global
        err = 0
        expect(tmpl('{x[0]}')).to.be(undefined)
        expect(err instanceof Error).to.be(true)
        expect(err.riotData).to.eql({ tagName: undefined, _riot_id: undefined })
      })

      it('GOTCHA: null as param for call([this]) defaults to global too', function () {
        var err

        tmpl.errorHandler = function (e) { err = e }
        err = 0
        expect(tmpl('{x[0]}', null)).to.be(undefined)
        expect(err instanceof Error).to.be(true)
        expect(err.riotData).to.eql({ tagName: undefined, _riot_id: undefined })
      })

      it('catching reading property of an undefined variable', function () {
        var result, err

        tmpl.errorHandler = function (e) { err = e }
        data.__ = { tagName: 'DIV' }
        data._riot_id = 1
        result = render('{ undefinedVar.property }')    // render as normal
        delete data._riot_id
        delete data.root

        expect(result).to.be(undefined)
        expect(err instanceof Error).to.be(true)
        expect(err.riotData).to.eql({ tagName: 'DIV', _riot_id: 1 })
      })

      it('top level undefined variables (properties) can\'t be catched', function () {
        var result, err = 0

        tmpl.errorHandler = function (e) { err = e }
        result = render('{ undefinedVar }')        // render as normal
        expect(result).to.be(undefined)
        expect(err).to.be.a('number')
      })

      it('errors only in the user defined error handler (riot/2108)', function () {
        var result, userErrOutput, defaultErrOutput

        tmpl.errorHandler = function (e) { userErrOutput = e }
        console.error = function (e) { defaultErrOutput = e }

        data.__ = { tagName: 'DIV' }
        data._riot_id = 1
        result = render('{ undefinedVar.property }')    // render as normal
        delete data._riot_id
        delete data.root

        console.error = function () { /* noop */ } // eslint-disable-line
        expect(result).to.be(undefined)
        expect(userErrOutput instanceof Error).to.be(true)
        expect(userErrOutput.riotData).to.eql({ tagName: 'DIV', _riot_id: 1 })
        expect(defaultErrOutput).to.be(undefined)
      })

      it('errors on instantiation of the getter always throws', function () {
        expect(render).withArgs('{ a: } }').to.throwError()  // SintaxError
        expect(render).withArgs('{ d c:1 }').to.throwError()
      })

      it('syntax errors on expressions throws exception', function () {
        expect(render).withArgs('{ a:(1 }').to.throwError()  // SintaxError
        expect(render).withArgs('{ c[0) }').to.throwError()
      })

    })

    //// helper functions

    describe('new helper functions', function () {

      it('tmpl.loopKeys: extract keys from the value (for `each`)', function () {
        var i,
          atest = [
            '{ studio in studios["Nearby Locations"] }', { key: 'studio', pos: undefined, val: '{studios["Nearby Locations"]}' },
            '{k,i in item}', { key: 'k', pos: 'i', val: '{item}' },
            '{ k in i }', { key: 'k', pos: undefined, val: '{i}' },
            '{^ item in i }', { key: 'item', pos: undefined, val: '{i}' },
            '{^item,idx in items } ', { key: 'item', pos: 'idx', val: '{items}' },
            '{ item}  ', { val: '{ item}' },
            '{item', { val: '{item' },    // val is expected
            '{}', { val: '{}' },
            '0', { val: '0' }
          ]

        for (i = 0; i < atest.length; i += 2) {
          expect(tmpl.loopKeys(atest[i])).to.eql(atest[i + 1])
        }
      })

      it('tmpl.loopKeys with custom brackets', function () {
        brackets.set('{{ }}')
        var i,
          atest = [
            '{{k,i in item}}', { key: 'k', pos: 'i', val: '{{item}}' },
            '{{ k in i }}', { key: 'k', pos: undefined, val: '{{i}}' },
            '{{^ item in i }}', { key: 'item', pos: undefined, val: '{{i}}' },
            '{{^item,idx in items }} ', { key: 'item', pos: 'idx', val: '{{items}}' },
            '{{ item}}  ', { val: '{{ item}}' },
            '{{item', { val: '{{item' },    // val is expected
            '{{}}', { val: '{{}}' },
            '0', { val: '0' }
          ]

        for (i = 0; i < atest.length; i += 2) {
          expect(tmpl.loopKeys(atest[i])).to.eql(atest[i + 1])
        }
        brackets.set(null)
      })

      it('tmpl.hasExpr: test for expression (brackets) existence', function () {
        expect(tmpl.hasExpr('{}')).to.be(true)
        expect(tmpl.hasExpr(' {} ')).to.be(true)
        expect(tmpl.hasExpr('{ 123 } ')).to.be(true)
        expect(tmpl.hasExpr('"{ "#" }"')).to.be(true)
        expect(tmpl.hasExpr('"{ " }')).to.be(true)
        expect(tmpl.hasExpr('\\{ 123 } ')).to.be(true)
        expect(tmpl.hasExpr(' \\{}')).to.be(true)
        expect(tmpl.hasExpr(' }{ ')).to.be(false)
      })
    })

  })
  // end of tmpl 2.3.0

  describe('tmpl 3.x', function () {

    it('has beter support for regexes', function () {
      data.i = { x: 1 }
      expect(render('<a>{ typeof /5/ }</a>')).to.be('<a>object</a>')
      expect(render('<a>{ 5*5 /i.x }</a>')).to.be('<a>25</a>')
      expect(render('<a>{ 5*5 /i.x/1 }</a>')).to.be('<a>25</a>')
      expect(render('{ 5+/./.lastIndex }')).to.be(5)
    })

    it('fixes riot#2361', function () {
      expect(render('<div>{ (2+3)/2 }</div>')).to.be('<div>2.5</div>')
    })
  })

})
