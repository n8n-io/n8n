assert(string.gsub('ülo ülo', 'ü', 'x') == 'xlo xlo')
assert(string.gsub('alo úlo  ', ' +$', '') == 'alo úlo')  -- trim
assert(string.gsub('  alo alo  ', '^%s*(.-)%s*$', '%1') == 'alo alo')  -- double trim
assert(string.gsub('alo  alo  \n 123\n ', '%s+', ' ') == 'alo alo 123 ')
t = "abç d"
a, b = string.gsub(t, '(.)', '%1@')
assert('@'..a == string.gsub(t, '', '@') and b == 5)
a, b = string.gsub('abçd', '(.)', '%0@', 2)
assert(a == 'a@b@çd' and b == 2)
assert(string.gsub('alo alo', '()[al]', '%1') == '12o 56o')
assert(string.gsub("abc=xyz", "(%w*)(%p)(%w+)", "%3%2%1-%0") ==
              "xyz=abc-abc=xyz")
assert(string.gsub("abc", "%w", "%1%0") == "aabbcc")
assert(string.gsub("abc", "%w+", "%0%1") == "abcabc")
assert(string.gsub('áéí', '$', '\0óú') == 'áéí\0óú')
assert(string.gsub('', '^', 'r') == 'r')
assert(string.gsub('', '$', 'r') == 'r')
