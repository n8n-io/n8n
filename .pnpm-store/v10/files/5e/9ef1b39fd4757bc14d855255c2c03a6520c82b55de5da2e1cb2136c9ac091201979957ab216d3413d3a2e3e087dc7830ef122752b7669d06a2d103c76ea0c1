"use strict";

const {
	lua: {
		LUA_OK,
		LUA_ERRRUN,
		lua_pcall,
		lua_pop,
		lua_pushvalue,
		lua_tojsstring
	},
	lauxlib: {
		luaL_dostring,
		luaL_loadstring,
		luaL_newstate,
		luaL_requiref
	},
	lualib: {
		luaL_openlibs
	},
	to_luastring
} = require("fengari");

describe("fengari-interop", function() {
	const {
		FENGARI_INTEROP_RELEASE,
		FENGARI_INTEROP_VERSION,
		FENGARI_INTEROP_VERSION_NUM,
		luaopen_js,
		push,
		tojs
	} = require("../src/js.js");
	const new_state = function() {
		const L = luaL_newstate();
		luaL_openlibs(L);
		luaL_requiref(L, to_luastring("js"), luaopen_js, 0);
		return L;
	};

	it("loads successfully", function() {
		expect(typeof luaopen_js).toBe("function");
	});

	it("version present from JS", function() {
		expect(require("../package.json").version).toEqual(expect.stringContaining(FENGARI_INTEROP_VERSION));
		expect(require("../package.json").version).toEqual(expect.stringContaining(FENGARI_INTEROP_RELEASE));
	});

	it("version present from lua", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		assert(js._VERSION == "${FENGARI_INTEROP_VERSION}")
		assert(js._VERSION_NUM == ${FENGARI_INTEROP_VERSION_NUM})
		assert(js._RELEASE == "${FENGARI_INTEROP_RELEASE}")
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("can be required from lua", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring('require("js")')) !== LUA_OK) {
			throw lua_tojsstring(L, -1);
		}
	});

	it("pushes same null every time", function() {
		const L = new_state();
		if (luaL_loadstring(L, to_luastring(`
		local null = ...
		local js = require "js"
		assert(null == js.null)
		assert(rawequal(null, js.null))
		`)) !== LUA_OK) {
			throw lua_tojsstring(L, -1);
		}
		push(L, null);
		if (lua_pcall(L, 1, 0, 0) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("test all types js -> lua", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		assert(rawequal(js.global:eval('void 0'), nil), "undefined not equal")
		assert(rawequal(js.global:eval('1'), 1.0), "numbers not equal")
		assert(rawequal(js.global:eval('"foo"'), "foo"), "strings not equal")
		assert(rawequal(js.global:eval('true'), true), "booleans not equal")
		assert(rawequal(js.global:eval('null'), js.null), "null not equal")
		assert(type(js.global:eval('({})')) == "userdata", "object type not userdata")
		assert(type(js.global:eval('(function(){})')) == "userdata", "function type not userdata")
		assert(type(js.global:eval('Symbol("test")')) == "userdata", "Symbol type not userdata")
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("test all types lua -> js", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		assert(js.global:Function('"use strict"; return this === void 0')(nil), "undefined not equal")
		assert(js.global:Function('"use strict"; return this === 1')(1.0), "numbers not equal")
		assert(js.global:Function('"use strict"; return this === "foo"')("foo"), "strings not equal")
		assert(js.global:Function('"use strict"; return this === true')(true), "booleans not equal")
		assert(js.global:Function('"use strict"; return this === null')(js.null), "null not equal")
		assert(js.global:Function('"use strict"; return typeof this === "function"')(function() end), "function type not userdata")
		assert(js.global:Function('"use strict"; return typeof this === "function"')(js.createproxy(function() end, "function")), "function proxy type not function")
		assert(js.global:Function('"use strict"; return typeof this === "object"')(js.createproxy({}, "object")), "object proxy type not object")
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("can round trip lua->js->lua", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		local myfunc = function() end -- something that takes proxy path
		js.global.foo = myfunc
		assert(rawequal(myfunc, js.global.foo))
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("allows calls with no 'this' or arguments", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		js.global.Date.now()
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("tostring on js objects", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		assert(tostring(js.null) == "null")
		assert(tostring(js.new(js.global.Object)) == "[object Object]")
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	describe("manipulating lua objects from JS", function() {
		test("apply success", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = function(x) return x+2 end
				local r = js.global:Function([[
					return this.apply(1, [])
				]]):call(t)
				assert(r == 3)
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		test("apply with odd 'args' argument", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = function(x, ...)
					assert(select("#", ...) == 0, "wrong number of arguments")
					return 42
				end
				assert(js.global:Function([[
					return this.apply(1, {length: {}}) // should coerce to 0
				]]):call(t) == 42)
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		test("apply throwing", function() {
			const L = new_state();
			expect(luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = function(x) error("injected failure") end
				js.global:Function([[
					return this.apply(1, [])
				]]):call(t)
			`))).toBe(LUA_ERRRUN);
			expect(tojs(L, -1)).toEqual(expect.stringContaining("injected failure"));
		});

		test("invoke success", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = function(x) return x+2, x*2 end
				local r = js.global:Function([[
					return this.invoke(1, [])
				]]):call(t)
				assert(r[0] == 3)
				assert(r[1] == 2)
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		test("invoke throwing", function() {
			const L = new_state();
			expect(luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = function(x) error("injected failure") end
				js.global:Function([[
					return this.invoke(1, [])
				]]):call(t)
			`))).toBe(LUA_ERRRUN);
			expect(tojs(L, -1)).toEqual(expect.stringContaining("injected failure"));
		});

		test("get success", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = {
					foo = "bar"
				}
				assert(js.global:Function([[
					return this.get("foo")
				]]):call(t) == "bar")
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		test("get throwing", function() {
			const L = new_state();
			expect(luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = setmetatable({}, {
					__index = function(t, k)
						error("injected failure")
					end;
				})
				js.global:Function([[
					this.get("foo")
				]]):call(t)
			`))).toBe(LUA_ERRRUN);
			expect(tojs(L, -1)).toEqual(expect.stringContaining("injected failure"));
		});

		test("has success", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = {
					foo = "bar"
				}
				assert(js.global:Function([[
					return this.has("foo")
				]]):call(t))
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		test("has throwing", function() {
			const L = new_state();
			expect(luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = setmetatable({}, {
					__index = function(t, k)
						error("injected failure")
					end;
				})
				js.global:Function([[
					this.has("foo")
				]]):call(t)
			`))).toBe(LUA_ERRRUN);
			expect(tojs(L, -1)).toEqual(expect.stringContaining("injected failure"));
		});

		test("set success", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = {}
				js.global:Function([[
					this.set("foo", "bar")
				]]):call(t)
				assert(t.foo == "bar")
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		test("set throwing", function() {
			const L = new_state();
			expect(luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = setmetatable({}, {
					__newindex = function(t, k, v)
						error("injected failure")
					end;
				})
				js.global:Function([[
					this.set("foo", "bar")
				]]):call(t)
			`))).toBe(LUA_ERRRUN);
			expect(tojs(L, -1)).toEqual(expect.stringContaining("injected failure"));
		});

		test("delete success", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = {
					foo = "bar"
				}
				js.global:Function([[
					this.delete("foo")
				]]):call(t)
				assert(t.foo == nil)
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		test("delete throwing", function() {
			const L = new_state();
			expect(luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = setmetatable({}, {
					__newindex = function(t, k, v)
						assert(v == nil)
						error("injected failure")
					end;
				})
				js.global:Function([[
					this.delete("foo")
				]]):call(t)
			`))).toBe(LUA_ERRRUN);
			expect(tojs(L, -1)).toEqual(expect.stringContaining("injected failure"));
		});

		test("toString success", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = setmetatable({}, {
					__tostring = function(t)
						return "my string"
					end;
				})
				assert(js.global:Function([[
					return this.toString()
				]]):call(t) == "my string")
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		test("toString throwing", function() {
			const L = new_state();
			expect(luaL_dostring(L, to_luastring(`
				local js = require "js"

				local t = setmetatable({}, {
					__tostring = function(t)
						error("injected failure")
					end;
				})
				js.global:Function([[
					this.toString()
				]]):call(t)
			`))).toBe(LUA_ERRRUN);
			expect(tojs(L, -1)).toEqual(expect.stringContaining("injected failure"));
		});
	});

	describe("iterating lua objects with Symbol.iterator", function() {
		it("works", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
				local js = require "js"
				js.global:Function([[
					let i = 0;
					for (let o of this) {
						i = i + 1;
						let expected;
						if (o[0] === 1)
							expected = "one";
						else if (o[0] === "foo")
							expected = "foo";
						else if (o[0] === "answer")
							expected = 42;
						else
							throw new Error("unexpected key");
						if (o[1] !== expected)
							throw new Error("unexpected value");
					}
					if (i !== 3) throw new Error("failed to iterate");
				]]):call({"one", foo = "foo", answer = 42})
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		it("handles error at pairs() time", function() {
			const L = new_state();
			expect(luaL_dostring(L, to_luastring(`
				local js = require "js"
				js.global:Function([[
					for (let o of this) {}
				]]):call(setmetatable({}, { __pairs = function() error("injected failure") end}))
			`))).toBe(LUA_ERRRUN);
			expect(tojs(L, -1)).toEqual(expect.stringContaining("injected failure"));
		});

		it("handles error at next() time", function() {
			const L = new_state();
			expect(luaL_dostring(L, to_luastring(`
				local js = require "js"
				js.global:Function([[
					for (let o of this) {}
				]]):call(setmetatable({}, { __pairs = function()
					return coroutine.wrap(function()
						coroutine.yield("one")
						error("injected failure")
					end)
				end}))
			`))).toBe(LUA_ERRRUN);
			expect(tojs(L, -1)).toEqual(expect.stringContaining("injected failure"));
		});
	});

	it("js.new works for #args 0..5", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		local a = js.new(js.global.Array)
		assert(a.length == 0)
		-- Array constructor does different things with single integer argument, use something else
		local a = js.new(js.global.Array, {})
		assert(a.length == 1)
		local a = js.new(js.global.Array, 1, 2)
		assert(a.length == 2)
		local a = js.new(js.global.Array, 1, 2, 3)
		assert(a.length == 3)
		local a = js.new(js.global.Array, 1, 2, 3, 4)
		assert(a.length == 4)
		local a = js.new(js.global.Array, 1, 2, 3, 4, 5)
		assert(a.length == 5)
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("js.tonumber works", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		assert(js.tonumber(1) == 1)
		assert(math.type(js.tonumber(1)) == "float")
		assert(js.tonumber("1") == 1)
		assert(math.type(js.tonumber("1")) == "float")
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("js.tostring works", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		local t = {}
		assert(tostring(t) == js.tostring(t))
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("js.instanceof works", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		assert(js.instanceof(js.new(js.global.Object), js.global.Object))
		assert(js.instanceof(js.new(js.global.Array), js.global.Object))
		assert(js.instanceof(js.new(js.global.Function), js.global.Function))

		-- Test negative case
		assert(not js.instanceof(js.global, js.global.Boolean))
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("js.typeof works", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		assert(js.typeof(true) == "boolean")
		assert(js.typeof(1) == "number")
		assert(js.typeof("foo") == "string")
		assert(js.typeof(js.null) == "object")
		assert(js.typeof(js.new(js.global.Object)) == "object")
		assert(js.typeof(js.new(js.global.Function)) == "function")
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("js.of works", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		local a = js.new(js.global.Array, 1, 2, 3)
		local i = 0
		for k in js.of(a) do
			i = i + 1
			assert(k == i)
		end
		assert(i == 3)
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("js.of fails on invalid args", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		do
			local obj = js.new(js.global.Object)
			assert(not pcall(js.of, obj))
		end
		do
			local obj = js.new(js.global.Object)
			obj[js.global.Symbol.iterator] = function() return "not an object" end
			assert(not pcall(js.of, obj))
		end
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("__len on typed arrays works", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		local a = js.new(js.global.Uint8Array, 10)
		assert(#a == 10)
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("non-function __len fails", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		local a = js.new(js.global.Object)
		a[js.global.Symbol["for"](nil, "__len")] = "not a function"
		local ok, err = pcall(function() return #a end)
		assert(not ok, "succeeded when should have failed")
		assert(tostring(err):match("not a function"), "wrong error")
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("allows iterating over objects with pairs()", function() {
		const L = new_state();
		if (luaL_dostring(L, to_luastring(`
		local js = require "js"
		local o = js.new(js.global.Object)
		o.foo = "foo"
		o.bar = "bar"
		local seen = {}
		local n_seen = 0
		for k, v in pairs(o) do
			seen[k] = v
			n_seen = n_seen + 1
		end
		assert(seen.foo == "foo")
		assert(seen.bar == "bar")
		assert(n_seen == 2)
		`)) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("well formed custom __pairs", function() {
		const L = new_state();
		if (luaL_loadstring(L, to_luastring(`
		local o = ...
		local js = require "js"
		local f, s, l = pairs(o)
		assert(s == js.null, "state incorrect")
		assert(l == nil, "initial incorrect")
		local x
		l, x = f(s, l)
		assert(l == 1, "incorrect 1st key")
		assert(x == "one", "incorrect 1st value")
		l, x = f(s, l)
		assert(l == 2, "incorrect 2nd key")
		assert(x == "two", "incorrect 2nd value")
		l, x = f(s, l)
		assert(l == nil, "expected end")
		`)) !== LUA_OK) {
			throw lua_tojsstring(L, -1);
		}
		push(L, {
			[Symbol.for("__pairs")]: function() {
				return {
					iter: function(last) {
						if (last === void 0) {
							return [1, "one"];
						} else if (last && last === 1) {
							return [2, "two"];
						} else {
							return void 0;
						}
					},
					state: null
				};
			}
		});
		if (lua_pcall(L, 1, 0, 0) !== LUA_OK) {
			throw tojs(L, -1);
		}
	});

	it("catches badly formed custom __pairs", function() {
		const L = new_state();
		if (luaL_loadstring(L, to_luastring(`
		local o = ...
		local js = require "js"
		for k, v in pairs(o) do
		end
		`)) !== LUA_OK) {
			throw lua_tojsstring(L, -1);
		}

		lua_pushvalue(L, -1);
		push(L, {
			[Symbol.for("__pairs")]: function() {}
		});
		expect(lua_pcall(L, 1, 0, 0)).toBe(LUA_ERRRUN);
		expect(tojs(L, -1)).toEqual(expect.stringContaining("bad '__pairs' result"));
		lua_pop(L, 1);

		lua_pushvalue(L, -1);
		push(L, {
			[Symbol.for("__pairs")]: function() {
				return {};
			}
		});
		expect(lua_pcall(L, 1, 0, 0)).toBe(LUA_ERRRUN);
		expect(tojs(L, -1)).toEqual(expect.stringContaining("bad '__pairs' result"));
		lua_pop(L, 1);

		lua_pushvalue(L, -1);
		push(L, {
			[Symbol.for("__pairs")]: function() {
				return {
					iter: function() {
						return "invalid result";
					}
				};
			}
		});
		expect(lua_pcall(L, 1, 0, 0)).toBe(LUA_ERRRUN);
		expect(tojs(L, -1)).toEqual(expect.stringContaining("bad iterator result"));
		lua_pop(L, 1);
	});

	describe("js.createproxy implements all proxy methods", function() {
		it("implements get/__index", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
			local js = require "js"
			local t = {}
			local mt = {}
			setmetatable(t, mt)
			local x = js.createproxy(t)

			local iscalled = false
			function mt:__index(k)
				iscalled = true
				assert(rawequal(self, t), "wrong self")
				assert(k == "foo", "wrong key")
				return "bar"
			end
			assert(x.foo == "bar")
			assert(iscalled)
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		it("implements has/__index", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
			local js = require "js"
			local t = {}
			local mt = {}
			setmetatable(t, mt)
			local x = js.createproxy(t)

			local iscalled = false
			function mt:__index(k)
				iscalled = true
				assert(rawequal(self, t), "wrong self")
				assert(k == "foo", "wrong key")
				return "bar"
			end
			assert(js.global.Reflect:has(x, "foo"))
			assert(iscalled)
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		it("implements set/__newindex", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
			local js = require "js"
			local t = {}
			local mt = {}
			setmetatable(t, mt)
			local x = js.createproxy(t)

			local iscalled = false
			function mt:__newindex(k, v)
				iscalled = true
				assert(rawequal(self, t), "wrong self")
				assert(k == "foo", "wrong key")
				assert(v == "bar", "wrong value")
			end
			x.foo = "bar"
			assert(iscalled)
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		it("implements delete", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
			local js = require "js"
			local t = {}
			local mt = {}
			setmetatable(t, mt)
			local x = js.createproxy(t)

			local iscalled = false
			-- delete is just a set to nil.
			function mt:__newindex(k, v)
				iscalled = true
				assert(rawequal(self, t), "wrong self")
				assert(k == "foo", "wrong key")
				assert(v == nil, "wrong value")
			end
			x.foo = nil
			assert(iscalled)
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		it("implements apply/__call", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
			local js = require "js"
			local t = {}
			local mt = {}
			setmetatable(t, mt)
			local x = js.createproxy(t)

			-- Try empty first
			local ok, err = pcall(x, 1, 2, 3, 4, 5)
			assert(not ok)
			assert(err:match "attempt to call a table value")

			local iscalled = false
			function mt:__call(...)
				iscalled = true
				assert(rawequal(self, t), "wrong self")
				assert(select("#", ...) == 5, "wrong number of args")
				local a, b, c, d, e = ...
				assert(a == 1)
				assert(b == 2)
				assert(c == 3)
				assert(d == 4)
				assert(e == 5)
			end
			x(1, 2, 3, 4, 5)
			assert(iscalled)
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		it("implements defineProperty", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
			local js = require "js"
			local t = {}
			local mt = {}
			setmetatable(t, mt)
			local x = js.createproxy(t)

			local prop = js.new(js.global.Object)

			-- Try empty first
			assert(js.global.Reflect:defineProperty(x, "foo", prop) == false)

			local iscalled = false
			function mt:defineProperty(k, property)
				iscalled = true
				assert(rawequal(self, t), "wrong self")
				assert(k == "foo", "wrong key")
				return true
			end
			assert(js.global.Reflect:defineProperty(x, "foo", prop) == true)
			assert(iscalled)
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		it("implements getOwnPropertyDescriptor", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
			local js = require "js"
			local t = {}
			local mt = {}
			setmetatable(t, mt)
			local x = js.createproxy(t)

			-- Try empty first
			assert(js.global.Reflect:getOwnPropertyDescriptor(x, "foo") == nil)

			local iscalled = false
			function mt:getOwnPropertyDescriptor(k)
				iscalled = true
				assert(rawequal(self, t), "wrong self")
				assert(k == "foo", "wrong key")
				local prop = js.new(js.global.Object)
				prop.configurable = true
				return prop
			end
			assert(js.global.Reflect:getOwnPropertyDescriptor(x, "foo").configurable == true)
			assert(iscalled)
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		it("implements getPrototypeOf", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
			local js = require "js"
			local t = {}
			local mt = {}
			setmetatable(t, mt)
			local x = js.createproxy(t)

			-- Try empty first
			assert(js.global.Reflect:getPrototypeOf(x) == js.null)

			local iscalled = false
			local proto = {}
			function mt:getPrototypeOf()
				iscalled = true
				assert(rawequal(self, t), "wrong self")
				return proto
			end
			assert(js.global.Reflect:getPrototypeOf(x) == proto)
			assert(iscalled)
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		it("implements setPrototypeOf", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
			local js = require "js"
			local t = {}
			local mt = {}
			setmetatable(t, mt)
			local x = js.createproxy(t)

			local proto = {}

			-- Try empty first
			assert(js.global.Reflect:setPrototypeOf(x, proto) == false, "expected false")

			local iscalled = false
			function mt:setPrototypeOf(newproto)
				iscalled = true
				assert(rawequal(self, t), "wrong self")
				assert(newproto == proto, "wrong new prototype")
				return true
			end
			assert(js.global.Reflect:setPrototypeOf(x, proto) == true, "expected true")
			assert(iscalled)
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		it("implements construct", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
			local js = require "js"
			for _, type in ipairs {"function", "arrow_function", "object"} do
				local t = {}
				local mt = {}
				setmetatable(t, mt)
				local x = js.createproxy(t, "function")

				-- Try empty first
				local ok, err = pcall(js.new, x, 1, 2, 3, 4, 5)
				assert(not ok)
				assert(js.instanceof(err, js.global.TypeError))
				assert(tostring(err):match "not a constructor")

				local iscalled = false
				local res = {}
				function mt:construct(...)
					iscalled = true
					assert(rawequal(self, t), "wrong self")
					assert(select("#", ...) == 5, "wrong number of args")
					local a, b, c, d, e = ...
					assert(a == 1)
					assert(b == 2)
					assert(c == 3)
					assert(d == 4)
					assert(e == 5)
					return res
				end
				assert(js.new(x, 1, 2, 3, 4, 5) == res)
				assert(iscalled)
			end
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});

		it("implements ownKeys", function() {
			const L = new_state();
			if (luaL_dostring(L, to_luastring(`
			local js = require "js"
			for _, type in ipairs {"function", "arrow_function", "object"} do
				local t = {}
				local mt = {}
				setmetatable(t, mt)
				local x = js.createproxy(t, type)

				-- Try empty first
				assert(not pcall(js.global.Reflect.ownKeys, nil, x), "ownKeys doesn't work by default")

				local iscalled = false
				function mt:ownKeys(...)
					iscalled = true
					assert(rawequal(self, t), "wrong self")
					return js.global.Array:of("foo", "bar")
				end
				local a = js.global.Reflect:ownKeys(x)
				assert(a[0] == "foo")
				assert(a[1] == "bar")
				assert(iscalled)
			end
			`)) !== LUA_OK) {
				throw tojs(L, -1);
			}
		});
	});
});
