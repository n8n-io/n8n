# Contributing

First, contributions are welcome! I expect smaller requests to be handled without issue. If you have a larger feature request that you want to contribute yourself, you might consider opening an issue first, as I make no guarantees about merging things, especially if they change the nature of the project, or make it do _a lot_ more than it already does. I'm a proponent of small, concise, single-purpose modules that do one thing and do it well.

## Style

Please try to adhere, as close as possible, to the style and structure already present in this repository. Please don't be offended if I ask you clean something up, as consistency is important. Please see the `.eslint.json` config for a comprehensive style guide. Some of the more salient points follow:

1. Two spaces. No literal tabs.
2. "Cuddled" elses and else ifs: e.g. `} else {`
3. Prefer

    ```
    exports.foo = function() {
    ```

    to

    ```
    module.exports = {
      foo: function() {
    ```

    unless you're exporting a single a function, like

    ```
    module.exports = function() {

    }
    ```

4. Use spaces at the beginning and end of inline objects and arrays: `{ foo: 'bar' }` and `[ 'foo', 'bar' ]`
5. But . . . if you have longer objects, please use line breaks like this:

    ```
    var obj = {
      foo: 'bar',
      list: [
        {
          name: baz'
        },
        {
          name: 'quux'
        }
      ]
    }
    ```

    I could also be okay with the slightly more compact array-of-object format:

    ```
    var obj = {
      foo: 'bar',
      list: [{
        name: baz'
      }, {
        name: 'quux'
      }]
    }
    ```

6. Use semi-colons to end lines.
7. Prefer single quotes _almost all the time_. The only places I use double quotes are 1) in json strings, 2) in html attributes, and 3) in quotes that have apostrophes in them (and even then, I sometimes just escape the apostrophe).
8. Be modular. I like semantically-named noun-based modules (e.g. a module that handles git stuff in a repo would be called "git") with one or more verb-named functions (like, "getRepo") that do related things. Individual functions should fit on the screen whenever possible. I don't like scrolling to see what's happening at the end of a function. And in general, modules should be relatively short. I would rather have a larger number of short modules, than a smaller number of long modules.
9. Use camel casing for variables. I have an inexplicable and arbitrary dislike for snake case.
10. Use kebab case (foo-bar) for file names.
11. Be DRY. If you find yourself reusing code, pull it out into a separate function.
12. No coffeescript, typescript, or flow. I like javascript the way it is. Please do use es6 features if you like though.
13. Please comment where appropriate. When in doubt, add a comment. I'm finding more and more that things that seem self-documenting when I write them are actually semi-incomprehensible when I read them. Inline comments are fine most of the time, though jsdoc style block comments before functions are nice too.

## Testing

Please write tests for any added feature or bug fix. Tests are run with gulp. 

## Commits and Git History

I actually don't care much about commit message formatting or keeping a clean history via squashes. Obviously, if you _want_ to do those things, that's fine, but I won't make you. In general, I think a commit message should be atomic (which is to say, if you need to use the word "and," then it should be two commits), should summarize the changes in the commit, and should use present tense, as in "Fix bug" (not "Fixed" or "Fixes"). 
