
unless YAML?
    YAML = require '../../src/Yaml'


# Parsing
#

describe 'Parsed YAML Collections', ->

    it 'can be simple sequence', ->

        expect YAML.parse """
        - apple
        - banana
        - carrot
        """
        .toEqual ['apple', 'banana', 'carrot']


    it 'can be nested sequences', ->

        expect YAML.parse """
        -
         - foo
         - bar
         - baz
        """
        .toEqual [['foo', 'bar', 'baz']]


    it 'can be mixed sequences', ->

        expect YAML.parse """
        - apple
        -
         - foo
         - bar
         - x123
        - banana
        - carrot
        """
        .toEqual ['apple', ['foo', 'bar', 'x123'], 'banana', 'carrot']


    it 'can be deeply nested sequences', ->

        expect YAML.parse """
        -
         -
          - uno
          - dos
        """
        .toEqual [[['uno', 'dos']]]


    it 'can be simple mapping', ->

        expect YAML.parse """
        foo: whatever
        bar: stuff
        """
        .toEqual foo: 'whatever', bar: 'stuff'


    it 'can be sequence in a mapping', ->

        expect YAML.parse """
        foo: whatever
        bar:
         - uno
         - dos
        """
        .toEqual foo: 'whatever', bar: ['uno', 'dos']


    it 'can be nested mappings', ->

        expect YAML.parse """
        foo: whatever
        bar:
         fruit: apple
         name: steve
         sport: baseball
        """
        .toEqual foo: 'whatever', bar: (fruit: 'apple', name: 'steve', sport: 'baseball')


    it 'can be mixed mapping', ->

        expect YAML.parse """
        foo: whatever
        bar:
         -
           fruit: apple
           name: steve
           sport: baseball
         - more
         -
           python: rocks
           perl: papers
           ruby: scissorses
        """
        .toEqual foo: 'whatever', bar: [
            (fruit: 'apple', name: 'steve', sport: 'baseball'),
            'more',
            (python: 'rocks', perl: 'papers', ruby: 'scissorses')
        ]


    it 'can have mapping-in-sequence shortcut', ->

        expect YAML.parse """
        - work on YAML.py:
           - work on Store
        """
        .toEqual [('work on YAML.py': ['work on Store'])]


    it 'can have unindented sequence-in-mapping shortcut', ->

        expect YAML.parse """
        allow:
        - 'localhost'
        - '%.sourceforge.net'
        - '%.freepan.org'
        """
        .toEqual (allow: ['localhost', '%.sourceforge.net', '%.freepan.org'])


    it 'can merge key', ->

        expect YAML.parse """
        mapping:
          name: Joe
          job: Accountant
          <<:
            age: 38
        """
        .toEqual mapping:
                    name: 'Joe'
                    job: 'Accountant'
                    age: 38

    it 'can ignore trailing empty lines for smallest indent', ->

        expect YAML.parse """ trailing: empty lines\n"""
        .toEqual trailing: 'empty lines'

describe 'Parsed YAML Inline Collections', ->

    it 'can be simple inline array', ->

        expect YAML.parse """
        ---
        seq: [ a, b, c ]
        """
        .toEqual seq: ['a', 'b', 'c']


    it 'can be simple inline hash', ->

        expect YAML.parse """
        ---
        hash: { name: Steve, foo: bar }
        """
        .toEqual hash: (name: 'Steve', foo: 'bar')


    it 'can be nested inline hash', ->

        expect YAML.parse """
        ---
        hash: { val1: "string", val2: { v2k1: "v2k1v" } }
        """
        .toEqual hash: (val1: 'string', val2: (v2k1: 'v2k1v'))


    it 'can be multi-line inline collections', ->

        expect YAML.parse """
        languages: [ Ruby,
                     Perl,
                     Python ]
        websites: { YAML: yaml.org,
                    Ruby: ruby-lang.org,
                    Python: python.org,
                    Perl: use.perl.org }
        """
        .toEqual (
            languages: ['Ruby', 'Perl', 'Python']
            websites:
                YAML: 'yaml.org'
                Ruby: 'ruby-lang.org'
                Python: 'python.org'
                Perl: 'use.perl.org'
        )



describe 'Parsed YAML Basic Types', ->

    it 'can be strings', ->

        expect YAML.parse """
        ---
        String
        """
        .toEqual 'String'


    it 'can be double-quoted strings with backslashes', ->

        expect YAML.parse """
        str:
            "string with \\\\ inside"
        """
        .toEqual str: 'string with \\ inside'


    it 'can be single-quoted strings with backslashes', ->

        expect YAML.parse """
        str:
            'string with \\\\ inside'
        """
        .toEqual str: 'string with \\\\ inside'


    it 'can be double-quoted strings with line breaks', ->

        expect YAML.parse """
        str:
            "string with \\n inside"
        """
        .toEqual str: 'string with \n inside'


    it 'can be single-quoted strings with escaped line breaks', ->

        expect YAML.parse """
        str:
            'string with \\n inside'
        """
        .toEqual str: 'string with \\n inside'


    it 'can be double-quoted strings with line breaks and backslashes', ->

        expect YAML.parse """
        str:
            "string with \\n inside and \\\\ also"
        """
        .toEqual str: 'string with \n inside and \\ also'


    it 'can be single-quoted strings with line breaks and backslashes', ->

        expect YAML.parse """
        str:
            'string with \\n inside and \\\\ also'
        """
        .toEqual str: 'string with \\n inside and \\\\ also'


    it 'can have string characters in sequences', ->

        expect YAML.parse """
        - What's Yaml?
        - It's for writing data structures in plain text.
        - And?
        - And what? That's not good enough for you?
        - No, I mean, "And what about Yaml?"
        - Oh, oh yeah. Uh.. Yaml for JavaScript.
        """
        .toEqual [
            "What's Yaml?",
            "It's for writing data structures in plain text.",
            "And?",
            "And what? That's not good enough for you?",
            "No, I mean, \"And what about Yaml?\"",
            "Oh, oh yeah. Uh.. Yaml for JavaScript."
        ]


    it 'can have indicators in strings', ->

        expect YAML.parse """
        the colon followed by space is an indicator: but is a string:right here
        same for the pound sign: here we have it#in a string
        the comma can, honestly, be used in most cases: [ but not in, inline collections ]
        """
        .toEqual (
            'the colon followed by space is an indicator': 'but is a string:right here',
            'same for the pound sign': 'here we have it#in a string',
            'the comma can, honestly, be used in most cases': ['but not in', 'inline collections']
        )


    it 'can force strings', ->

        expect YAML.parse """
        date string: !str 2001-08-01
        number string: !str 192
        date string 2: !!str 2001-08-01
        number string 2: !!str 192
        """
        .toEqual (
            'date string': '2001-08-01',
            'number string': '192' ,
            'date string 2': '2001-08-01',
            'number string 2': '192'
        )


    it 'can be single-quoted strings', ->

        expect YAML.parse """
        all my favorite symbols: '#:!/%.)'
        a few i hate: '&(*'
        why do i hate them?: 'it''s very hard to explain'
        """
        .toEqual (
            'all my favorite symbols': '#:!/%.)',
            'a few i hate': '&(*',
            'why do i hate them?': 'it\'s very hard to explain'
        )


    it 'can be double-quoted strings', ->

        expect YAML.parse """
        i know where i want my line breaks: "one here\\nand another here\\n"
        """
        .toEqual (
            'i know where i want my line breaks': "one here\nand another here\n"
        )


    it 'can be null', ->

        expect YAML.parse """
        name: Mr. Show
        hosted by: Bob and David
        date of next season: ~
        """
        .toEqual (
            'name': 'Mr. Show'
            'hosted by': 'Bob and David'
            'date of next season': null
        )


    it 'can be boolean', ->

        expect YAML.parse """
        Is Gus a Liar?: true
        Do I rely on Gus for Sustenance?: false
        """
        .toEqual (
            'Is Gus a Liar?': true
            'Do I rely on Gus for Sustenance?': false
        )


    it 'can be integers', ->

        expect YAML.parse """
        zero: 0
        simple: 12
        one-thousand: 1,000
        negative one-thousand: -1,000
        """
        .toEqual (
            'zero': 0
            'simple': 12
            'one-thousand': 1000
            'negative one-thousand': -1000
        )


    it 'can be integers as map keys', ->

        expect YAML.parse """
        1: one
        2: two
        3: three
        """
        .toEqual (
            1: 'one'
            2: 'two'
            3: 'three'
        )


    it 'can be floats', ->

        expect YAML.parse """
        a simple float: 2.00
        larger float: 1,000.09
        scientific notation: 1.00009e+3
        """
        .toEqual (
            'a simple float': 2.0
            'larger float': 1000.09
            'scientific notation': 1000.09
        )


    it 'can be time', ->

        iso8601Date = new Date Date.UTC(2001, 12-1, 14, 21, 59, 43, 10)
        iso8601Date.setTime iso8601Date.getTime() - 5 * 3600 * 1000

        spaceSeparatedDate = new Date Date.UTC(2001, 12-1, 14, 21, 59, 43, 10)
        spaceSeparatedDate.setTime spaceSeparatedDate.getTime() + 5 * 3600 * 1000

        withDatesToTime = (input) ->
            res = {}
            for key, val of input
                res[key] = val.getTime()
            return res

        expect withDatesToTime(YAML.parse """
            iso8601: 2001-12-14t21:59:43.010+05:00
            space separated: 2001-12-14 21:59:43.010 -05:00
        """)
        .toEqual withDatesToTime (
            'iso8601': iso8601Date
            'space separated': spaceSeparatedDate
        )


    it 'can be date', ->

        aDate = new Date Date.UTC(1976, 7-1, 31, 0, 0, 0, 0)

        withDatesToTime = (input) ->
            return input
            res = {}
            for key, val of input
                res[key] = val.getTime()
            return res

        expect withDatesToTime(YAML.parse """
            date: 1976-07-31
        """)
        .toEqual withDatesToTime (
            'date': aDate
        )



describe 'Parsed YAML Blocks', ->

    it 'can be single ending newline', ->

        expect YAML.parse """
        ---
        this: |
            Foo
            Bar
        """
        .toEqual 'this': "Foo\nBar\n"


    it 'can be single ending newline with \'+\' indicator', ->

        expect YAML.parse """
        normal: |
          extra new lines not kept

        preserving: |+
          extra new lines are kept


        dummy: value
        """
        .toEqual (
            'normal': "extra new lines not kept\n"
            'preserving': "extra new lines are kept\n\n\n"
            'dummy': 'value'
        )


    it 'can be multi-line block handling trailing newlines in function of \'+\', \'-\' indicators', ->

        expect YAML.parse """
        clipped: |
            This has one newline.



        same as "clipped" above: "This has one newline.\\n"

        stripped: |-
            This has no newline.



        same as "stripped" above: "This has no newline."

        kept: |+
            This has four newlines.



        same as "kept" above: "This has four newlines.\\n\\n\\n\\n"
        """
        .toEqual (
            'clipped': "This has one newline.\n"
            'same as "clipped" above': "This has one newline.\n"
            'stripped':'This has no newline.'
            'same as "stripped" above': 'This has no newline.'
            'kept': "This has four newlines.\n\n\n\n"
            'same as "kept" above': "This has four newlines.\n\n\n\n"
        )


    it 'can be folded block in a sequence', ->

        expect YAML.parse """
        ---
        - apple
        - banana
        - >
            can't you see
            the beauty of yaml?
            hmm
        - dog
        """
        .toEqual [
            'apple',
            'banana',
            "can't you see the beauty of yaml? hmm\n",
            'dog'
        ]


    it 'can be folded block as a mapping value', ->

        expect YAML.parse """
        ---
        quote: >
            Mark McGwire's
            year was crippled
            by a knee injury.
        source: espn
        """
        .toEqual (
            'quote': "Mark McGwire's year was crippled by a knee injury.\n"
            'source': 'espn'
        )


    it 'can be folded block handling trailing newlines in function of \'+\', \'-\' indicators', ->

        expect YAML.parse """
        clipped: >
            This has one newline.



        same as "clipped" above: "This has one newline.\\n"

        stripped: >-
            This has no newline.



        same as "stripped" above: "This has no newline."

        kept: >+
            This has four newlines.



        same as "kept" above: "This has four newlines.\\n\\n\\n\\n"
        """
        .toEqual (
            'clipped': "This has one newline.\n"
            'same as "clipped" above': "This has one newline.\n"
            'stripped': 'This has no newline.'
            'same as "stripped" above': 'This has no newline.'
            'kept': "This has four newlines.\n\n\n\n"
            'same as "kept" above': "This has four newlines.\n\n\n\n"
        )


    it 'can be the whole document as intented block', ->

        expect YAML.parse """
        ---
          foo: "bar"
          baz:
            - "qux"
            - "quxx"
          corge: null
        """
        .toEqual (
            'foo': "bar"
            'baz': ['qux', 'quxx']
            'corge': null
        )




describe 'Parsed YAML Comments', ->

    it 'can begin the document', ->

        expect YAML.parse """
        # This is a comment
        hello: world
        """
        .toEqual (
            hello: 'world'
        )


    it 'can be less indented in mapping', ->

        expect YAML.parse """
        parts:
            a: 'b'
            # normally indented comment
            c: 'd'
        # less indented comment
            e: 'f'
        """
        .toEqual (
            parts: {a: 'b', c: 'd', e: 'f'}
        )


    it 'can be less indented in sequence', ->

        expect YAML.parse """
        list-header:
          - item1
        #  - item2
          - item3
          # - item4
        """
        .toEqual (
            'list-header': ['item1', 'item3']
        )


    it 'can finish a line', ->

        expect YAML.parse """
        hello: world # This is a comment
        """
        .toEqual (
            hello: 'world'
        )


    it 'can end the document', ->

        expect YAML.parse """
        hello: world
        # This is a comment
        """
        .toEqual (
            hello: 'world'
        )



describe 'Parsed YAML Aliases and Anchors', ->

    it 'can be simple alias', ->

        expect YAML.parse """
        - &showell Steve
        - Clark
        - Brian
        - Oren
        - *showell
        """
        .toEqual ['Steve', 'Clark', 'Brian', 'Oren', 'Steve']


    it 'can be alias of a mapping', ->

        expect YAML.parse """
        - &hello
            Meat: pork
            Starch: potato
        - banana
        - *hello
        """
        .toEqual [
            Meat: 'pork', Starch: 'potato'
        ,
            'banana'
        ,
            Meat: 'pork', Starch: 'potato'
        ]



describe 'Parsed YAML Documents', ->

    it 'can have YAML header', ->

        expect YAML.parse """
        --- %YAML:1.0
        foo: 1
        bar: 2
        """
        .toEqual (
            foo: 1
            bar: 2
        )


    it 'can have leading document separator', ->

        expect YAML.parse """
        ---
        - foo: 1
          bar: 2
        """
        .toEqual [(
            foo: 1
            bar: 2
        )]


    it 'can have multiple document separators in block', ->

        expect YAML.parse """
        foo: |
            ---
            foo: bar
            ---
            yo: baz
        bar: |
            fooness
        """
        .toEqual (
           foo: "---\nfoo: bar\n---\nyo: baz\n"
           bar: "fooness\n"
        )


# Dumping
#

describe 'Dumped YAML Collections', ->

    it 'can be simple sequence', ->

        expect YAML.parse """
        - apple
        - banana
        - carrot
        """
        .toEqual YAML.parse YAML.dump ['apple', 'banana', 'carrot']


    it 'can be nested sequences', ->

        expect YAML.parse """
        -
         - foo
         - bar
         - baz
        """
        .toEqual YAML.parse YAML.dump [['foo', 'bar', 'baz']]


    it 'can be mixed sequences', ->

        expect YAML.parse """
        - apple
        -
         - foo
         - bar
         - x123
        - banana
        - carrot
        """
        .toEqual YAML.parse YAML.dump ['apple', ['foo', 'bar', 'x123'], 'banana', 'carrot']


    it 'can be deeply nested sequences', ->

        expect YAML.parse """
        -
         -
          - uno
          - dos
        """
        .toEqual YAML.parse YAML.dump [[['uno', 'dos']]]


    it 'can be simple mapping', ->

        expect YAML.parse """
        foo: whatever
        bar: stuff
        """
        .toEqual YAML.parse YAML.dump foo: 'whatever', bar: 'stuff'


    it 'can be sequence in a mapping', ->

        expect YAML.parse """
        foo: whatever
        bar:
         - uno
         - dos
        """
        .toEqual YAML.parse YAML.dump foo: 'whatever', bar: ['uno', 'dos']


    it 'can be nested mappings', ->

        expect YAML.parse """
        foo: whatever
        bar:
         fruit: apple
         name: steve
         sport: baseball
        """
        .toEqual YAML.parse YAML.dump foo: 'whatever', bar: (fruit: 'apple', name: 'steve', sport: 'baseball')


    it 'can be mixed mapping', ->

        expect YAML.parse """
        foo: whatever
        bar:
         -
           fruit: apple
           name: steve
           sport: baseball
         - more
         -
           python: rocks
           perl: papers
           ruby: scissorses
        """
        .toEqual YAML.parse YAML.dump foo: 'whatever', bar: [
            (fruit: 'apple', name: 'steve', sport: 'baseball'),
            'more',
            (python: 'rocks', perl: 'papers', ruby: 'scissorses')
        ]


    it 'can have mapping-in-sequence shortcut', ->

        expect YAML.parse """
        - work on YAML.py:
           - work on Store
        """
        .toEqual YAML.parse YAML.dump [('work on YAML.py': ['work on Store'])]


    it 'can have unindented sequence-in-mapping shortcut', ->

        expect YAML.parse """
        allow:
        - 'localhost'
        - '%.sourceforge.net'
        - '%.freepan.org'
        """
        .toEqual YAML.parse YAML.dump (allow: ['localhost', '%.sourceforge.net', '%.freepan.org'])


    it 'can merge key', ->

        expect YAML.parse """
        mapping:
          name: Joe
          job: Accountant
          <<:
            age: 38
        """
        .toEqual YAML.parse YAML.dump mapping:
                    name: 'Joe'
                    job: 'Accountant'
                    age: 38



describe 'Dumped YAML Inline Collections', ->

    it 'can be simple inline array', ->

        expect YAML.parse """
        ---
        seq: [ a, b, c ]
        """
        .toEqual YAML.parse YAML.dump seq: ['a', 'b', 'c']


    it 'can be simple inline hash', ->

        expect YAML.parse """
        ---
        hash: { name: Steve, foo: bar }
        """
        .toEqual YAML.parse YAML.dump hash: (name: 'Steve', foo: 'bar')


    it 'can be multi-line inline collections', ->

        expect YAML.parse """
        languages: [ Ruby,
                     Perl,
                     Python ]
        websites: { YAML: yaml.org,
                    Ruby: ruby-lang.org,
                    Python: python.org,
                    Perl: use.perl.org }
        """
        .toEqual YAML.parse YAML.dump (
            languages: ['Ruby', 'Perl', 'Python']
            websites:
                YAML: 'yaml.org'
                Ruby: 'ruby-lang.org'
                Python: 'python.org'
                Perl: 'use.perl.org'
        )

    it 'can be dumped empty sequences in mappings', ->

        expect YAML.parse(YAML.dump({key:[]}))
        .toEqual({key:[]})

    it 'can be dumpted empty inline collections', ->

        expect YAML.parse(YAML.dump({key:{}}))
        .toEqual({key:{}})

describe 'Dumped YAML Basic Types', ->

    it 'can be strings', ->

        expect YAML.parse """
        ---
        String
        """
        .toEqual YAML.parse YAML.dump 'String'


    it 'can be double-quoted strings with backslashes', ->

        expect YAML.parse """
        str:
            "string with \\\\ inside"
        """
        .toEqual YAML.parse YAML.dump str: 'string with \\ inside'


    it 'can be single-quoted strings with backslashes', ->

        expect YAML.parse """
        str:
            'string with \\\\ inside'
        """
        .toEqual YAML.parse YAML.dump str: 'string with \\\\ inside'


    it 'can be double-quoted strings with line breaks', ->

        expect YAML.parse """
        str:
            "string with \\n inside"
        """
        .toEqual YAML.parse YAML.dump str: 'string with \n inside'


    it 'can be double-quoted strings with line breaks and backslashes', ->

        expect YAML.parse """
        str:
            "string with \\n inside and \\\\ also"
        """
        .toEqual YAML.parse YAML.dump str: 'string with \n inside and \\ also'


    it 'can be single-quoted strings with line breaks and backslashes', ->

        expect YAML.parse """
        str:
            'string with \\n inside and \\\\ also'
        """
        .toEqual YAML.parse YAML.dump str: 'string with \\n inside and \\\\ also'


    it 'can be single-quoted strings with escaped line breaks', ->

        expect YAML.parse """
        str:
            'string with \\n inside'
        """
        .toEqual YAML.parse YAML.dump str: 'string with \\n inside'


    it 'can have string characters in sequences', ->

        expect YAML.parse """
        - What's Yaml?
        - It's for writing data structures in plain text.
        - And?
        - And what? That's not good enough for you?
        - No, I mean, "And what about Yaml?"
        - Oh, oh yeah. Uh.. Yaml for JavaScript.
        """
        .toEqual YAML.parse YAML.dump [
            "What's Yaml?",
            "It's for writing data structures in plain text.",
            "And?",
            "And what? That's not good enough for you?",
            "No, I mean, \"And what about Yaml?\"",
            "Oh, oh yeah. Uh.. Yaml for JavaScript."
        ]


    it 'can have indicators in strings', ->

        expect YAML.parse """
        the colon followed by space is an indicator: but is a string:right here
        same for the pound sign: here we have it#in a string
        the comma can, honestly, be used in most cases: [ but not in, inline collections ]
        """
        .toEqual YAML.parse YAML.dump (
            'the colon followed by space is an indicator': 'but is a string:right here',
            'same for the pound sign': 'here we have it#in a string',
            'the comma can, honestly, be used in most cases': ['but not in', 'inline collections']
        )


    it 'can force strings', ->

        expect YAML.parse """
        date string: !str 2001-08-01
        number string: !str 192
        date string 2: !!str 2001-08-01
        number string 2: !!str 192
        """
        .toEqual YAML.parse YAML.dump (
            'date string': '2001-08-01',
            'number string': '192' ,
            'date string 2': '2001-08-01',
            'number string 2': '192'
        )


    it 'can be single-quoted strings', ->

        expect YAML.parse """
        all my favorite symbols: '#:!/%.)'
        a few i hate: '&(*'
        why do i hate them?: 'it''s very hard to explain'
        """
        .toEqual YAML.parse YAML.dump (
            'all my favorite symbols': '#:!/%.)',
            'a few i hate': '&(*',
            'why do i hate them?': 'it\'s very hard to explain'
        )


    it 'can be double-quoted strings', ->

        expect YAML.parse """
        i know where i want my line breaks: "one here\\nand another here\\n"
        """
        .toEqual YAML.parse YAML.dump (
            'i know where i want my line breaks': "one here\nand another here\n"
        )


    it 'can be null', ->

        expect YAML.parse """
        name: Mr. Show
        hosted by: Bob and David
        date of next season: ~
        """
        .toEqual YAML.parse YAML.dump (
            'name': 'Mr. Show'
            'hosted by': 'Bob and David'
            'date of next season': null
        )


    it 'can be boolean', ->

        expect YAML.parse """
        Is Gus a Liar?: true
        Do I rely on Gus for Sustenance?: false
        """
        .toEqual YAML.parse YAML.dump (
            'Is Gus a Liar?': true
            'Do I rely on Gus for Sustenance?': false
        )


    it 'can be integers', ->

        expect YAML.parse """
        zero: 0
        simple: 12
        one-thousand: 1,000
        negative one-thousand: -1,000
        """
        .toEqual YAML.parse YAML.dump (
            'zero': 0
            'simple': 12
            'one-thousand': 1000
            'negative one-thousand': -1000
        )


    it 'can be integers as map keys', ->

        expect YAML.parse """
        1: one
        2: two
        3: three
        """
        .toEqual YAML.parse YAML.dump (
            1: 'one'
            2: 'two'
            3: 'three'
        )


    it 'can be floats', ->

        expect YAML.parse """
        a simple float: 2.00
        larger float: 1,000.09
        scientific notation: 1.00009e+3
        """
        .toEqual YAML.parse YAML.dump (
            'a simple float': 2.0
            'larger float': 1000.09
            'scientific notation': 1000.09
        )


    it 'can be time', ->

        iso8601Date = new Date Date.UTC(2001, 12-1, 14, 21, 59, 43, 10)
        iso8601Date.setTime iso8601Date.getTime() + 5 * 3600 * 1000

        spaceSeparatedDate = new Date Date.UTC(2001, 12-1, 14, 21, 59, 43, 10)
        spaceSeparatedDate.setTime spaceSeparatedDate.getTime() - 5 * 3600 * 1000

        withDatesToTime = (input) ->
            res = {}
            for key, val of input
                res[key] = val.getTime()
            return res

        expect withDatesToTime(YAML.parse """
            iso8601: 2001-12-14t21:59:43.010-05:00
            space separated: 2001-12-14 21:59:43.010 +05:00
        """)
        .toEqual YAML.parse YAML.dump withDatesToTime (
            'iso8601': iso8601Date
            'space separated': spaceSeparatedDate
        )


    it 'can be date', ->

        aDate = new Date Date.UTC(1976, 7-1, 31, 0, 0, 0, 0)

        withDatesToTime = (input) ->
            return input
            res = {}
            for key, val of input
                res[key] = val.getTime()
            return res

        expect withDatesToTime(YAML.parse """
            date: 1976-07-31
        """)
        .toEqual YAML.parse YAML.dump withDatesToTime (
            'date': aDate
        )



describe 'Dumped YAML Blocks', ->

    it 'can be single ending newline', ->

        expect YAML.parse """
        ---
        this: |
            Foo
            Bar
        """
        .toEqual YAML.parse YAML.dump 'this': "Foo\nBar\n"


    it 'can be single ending newline with \'+\' indicator', ->

        expect YAML.parse """
        normal: |
          extra new lines not kept

        preserving: |+
          extra new lines are kept


        dummy: value
        """
        .toEqual YAML.parse YAML.dump (
            'normal': "extra new lines not kept\n"
            'preserving': "extra new lines are kept\n\n\n"
            'dummy': 'value'
        )


    it 'can be multi-line block handling trailing newlines in function of \'+\', \'-\' indicators', ->

        expect YAML.parse """
        clipped: |
            This has one newline.



        same as "clipped" above: "This has one newline.\\n"

        stripped: |-
            This has no newline.



        same as "stripped" above: "This has no newline."

        kept: |+
            This has four newlines.



        same as "kept" above: "This has four newlines.\\n\\n\\n\\n"
        """
        .toEqual YAML.parse YAML.dump (
            'clipped': "This has one newline.\n"
            'same as "clipped" above': "This has one newline.\n"
            'stripped':'This has no newline.'
            'same as "stripped" above': 'This has no newline.'
            'kept': "This has four newlines.\n\n\n\n"
            'same as "kept" above': "This has four newlines.\n\n\n\n"
        )


    it 'can be folded block in a sequence', ->

        expect YAML.parse """
        ---
        - apple
        - banana
        - >
            can't you see
            the beauty of yaml?
            hmm
        - dog
        """
        .toEqual YAML.parse YAML.dump [
            'apple',
            'banana',
            "can't you see the beauty of yaml? hmm\n",
            'dog'
        ]


    it 'can be folded block as a mapping value', ->

        expect YAML.parse """
        ---
        quote: >
            Mark McGwire's
            year was crippled
            by a knee injury.
        source: espn
        """
        .toEqual YAML.parse YAML.dump (
            'quote': "Mark McGwire's year was crippled by a knee injury.\n"
            'source': 'espn'
        )


    it 'can be folded block handling trailing newlines in function of \'+\', \'-\' indicators', ->

        expect YAML.parse """
        clipped: >
            This has one newline.



        same as "clipped" above: "This has one newline.\\n"

        stripped: >-
            This has no newline.



        same as "stripped" above: "This has no newline."

        kept: >+
            This has four newlines.



        same as "kept" above: "This has four newlines.\\n\\n\\n\\n"
        """
        .toEqual YAML.parse YAML.dump (
            'clipped': "This has one newline.\n"
            'same as "clipped" above': "This has one newline.\n"
            'stripped': 'This has no newline.'
            'same as "stripped" above': 'This has no newline.'
            'kept': "This has four newlines.\n\n\n\n"
            'same as "kept" above': "This has four newlines.\n\n\n\n"
        )



describe 'Dumped YAML Comments', ->

    it 'can begin the document', ->

        expect YAML.parse """
        # This is a comment
        hello: world
        """
        .toEqual YAML.parse YAML.dump (
            hello: 'world'
        )


    it 'can finish a line', ->

        expect YAML.parse """
        hello: world # This is a comment
        """
        .toEqual YAML.parse YAML.dump (
            hello: 'world'
        )


    it 'can end the document', ->

        expect YAML.parse """
        hello: world
        # This is a comment
        """
        .toEqual YAML.parse YAML.dump (
            hello: 'world'
        )



describe 'Dumped YAML Aliases and Anchors', ->

    it 'can be simple alias', ->

        expect YAML.parse """
        - &showell Steve
        - Clark
        - Brian
        - Oren
        - *showell
        """
        .toEqual YAML.parse YAML.dump ['Steve', 'Clark', 'Brian', 'Oren', 'Steve']


    it 'can be alias of a mapping', ->

        expect YAML.parse """
        - &hello
            Meat: pork
            Starch: potato
        - banana
        - *hello
        """
        .toEqual YAML.parse YAML.dump [
            Meat: 'pork', Starch: 'potato'
        ,
            'banana'
        ,
            Meat: 'pork', Starch: 'potato'
        ]



describe 'Dumped YAML Documents', ->

    it 'can have YAML header', ->

        expect YAML.parse """
        --- %YAML:1.0
        foo: 1
        bar: 2
        """
        .toEqual YAML.parse YAML.dump (
            foo: 1
            bar: 2
        )


    it 'can have leading document separator', ->

        expect YAML.parse """
        ---
        - foo: 1
          bar: 2
        """
        .toEqual YAML.parse YAML.dump [(
            foo: 1
            bar: 2
        )]


    it 'can have multiple document separators in block', ->

        expect YAML.parse """
        foo: |
            ---
            foo: bar
            ---
            yo: baz
        bar: |
            fooness
        """
        .toEqual YAML.parse YAML.dump (
           foo: "---\nfoo: bar\n---\nyo: baz\n"
           bar: "fooness\n"
        )


# Loading
# (disable test when running locally from file)
#
url = document?.location?.href
if not(url?) or url.indexOf('file://') is -1

    examplePath = 'spec/example.yml'
    if __dirname?
        examplePath = __dirname+'/example.yml'

    describe 'YAML loading', ->

        it 'can be done synchronously', ->

            expect(YAML.load(examplePath)).toEqual (
                this: 'is'
                a: ['YAML', 'example']
            )


        it 'can be done asynchronously', (done) ->

            YAML.load examplePath, (result) ->

                expect(result).toEqual (
                    this: 'is'
                    a: ['YAML', 'example']
                )

                done()
