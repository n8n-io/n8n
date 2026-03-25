pretty_vcproj:
  Usage: pretty_vcproj.py "c:\path\to\vcproj.vcproj" [key1=value1] [key2=value2]

  They key/value pair are used to resolve vsprops name.

  For example, if I want to diff the base.vcproj project:

  pretty_vcproj.py z:\dev\src-chrome\src\base\build\base.vcproj "$(SolutionDir)=z:\dev\src-chrome\src\chrome\\" "$(CHROMIUM_BUILD)=" "$(CHROME_BUILD_TYPE)=" > original.txt
  pretty_vcproj.py z:\dev\src-chrome\src\base\base_gyp.vcproj "$(SolutionDir)=z:\dev\src-chrome\src\chrome\\" "$(CHROMIUM_BUILD)=" "$(CHROME_BUILD_TYPE)=" > gyp.txt

  And you can use your favorite diff tool to see the changes.

  Note: In the case of base.vcproj, the original vcproj is one level up the generated one.
        I suggest you do a search and replace for '"..\' and replace it with '"' in original.txt
        before you perform the diff.