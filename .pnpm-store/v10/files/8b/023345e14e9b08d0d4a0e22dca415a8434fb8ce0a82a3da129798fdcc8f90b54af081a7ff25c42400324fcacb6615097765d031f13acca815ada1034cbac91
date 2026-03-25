# Installation notes for macOS Catalina (v10.15)

_This document specifically refers to upgrades from previous versions of macOS to Catalina (10.15). It should be removed from the source repository when Catalina ceases to be the latest macOS version or when future Catalina versions no longer raise these issues._

**Both upgrading to macOS Catalina and running a Software Update in Catalina may cause normal `node-gyp` installations to fail. This might manifest as the following error during `npm install`:**

```console
gyp: No Xcode or CLT version detected!
```

## node-gyp v7

The newest release of `node-gyp` should solve this problem. If you are using `node-gyp` directly then you should be able to install v7 and use it as-is.

If you need to use `node-gyp` from within `npm` (e.g. through `npm install`), you will have to install `node-gyp` (either globally with `-g` or to a predictable location) and tell `npm` where the new version is. Either use:

* `npm config set node_gyp <path to node-gyp>`; or
* run `npm` with an environment variable prefix: `npm_config_node_gyp=<path to node-gyp> npm install`

Where "path to node-gyp" is to the `node-gyp` executable which may be a symlink in your global bin directory (e.g. `/usr/local/bin/node-gyp`), or a path to the `node-gyp` installation directory and the `bin/node-gyp.js` file within it (e.g. `/usr/local/lib/node_modules/node-gyp/bin/node-gyp.js`).

**If you use `npm config set` to change your global `node_gyp` you are responsible for keeping it up to date and can't rely on `npm` to give you a newer version when available.** Use `npm config delete node_gyp` to unset this configuration option.

## Fixing Catalina for older versions of `node-gyp`

### Is my Mac running macOS Catalina?
Let's first make sure that your Mac is running Catalina:
```
% sw_vers
    ProductName:	Mac OS X
    ProductVersion:	10.15
    BuildVersion:	19A602
```
If `ProductVersion` is less then `10.15` then this document is not for you. Normal install docs for `node-gyp` on macOS can be found at https://github.com/nodejs/node-gyp#on-macos


### The acid test
To see if `Xcode Command Line Tools` is installed in a way that will work with `node-gyp`, run:
```
curl -sL https://github.com/nodejs/node-gyp/raw/master/macOS_Catalina_acid_test.sh | bash
```

If test succeeded, _you are done_! You should be ready to [install](https://github.com/nodejs/node-gyp#installation) `node-gyp`.

If test failed, there is a problem with your Xcode Command Line Tools installation. [Continue to Solutions](#Solutions).

### Solutions
There are three ways to install the Xcode libraries `node-gyp` needs on macOS. People running Catalina have had success with some but not others in a way that has been unpredictable.

1. With the full Xcode (~7.6 GB download) from the `App Store` app.
2. With the _much_ smaller Xcode Command Line Tools via `xcode-select --install`
3. With the _much_ smaller Xcode Command Line Tools via manual download. **For people running the latest version of Catalina (10.15.2 at the time of this writing), this has worked when the other two solutions haven't.**

### Installing `node-gyp` using the full Xcode
1. `xcodebuild -version` should show `Xcode 11.1` or later.
    * If not, then install/upgrade Xcode from the App Store app.
2. Open the Xcode app and...
    * Under __Preferences > Locations__ select the tools if their location is empty.
    * Allow Xcode app to do an essential install of the most recent compiler tools.
3. Once all installations are _complete_, quit out of Xcode.
4. `sudo xcodebuild -license accept`  # If you agree with the licensing terms.
5. `softwareupdate -l`  # No listing is a good sign.
    * If Xcode or Tools upgrades are listed, use "Software Upgrade" to install them.
6. `xcode-select -version`  # Should return `xcode-select version 2370` or later.
7. `xcode-select -print-path`  # Should return `/Applications/Xcode.app/Contents/Developer`
8. Try the [_acid test_ steps above](#The-acid-test) to see if your Mac is ready.
9. If the _acid test_ does _not_ pass then...
10. `sudo xcode-select --reset`  # Enter root password.  No output is normal.
11. Repeat step 7 above.  Is the path different this time?  Repeat the _acid test_.

### Installing `node-gyp` using the Xcode Command Line Tools via `xcode-select --install`
1. If the _acid test_ has not succeeded, then try `xcode-select --install`
2. If the installation command returns `xcode-select: error: command line tools are already installed, use "Software Update" to install updates`, continue to [remove and reinstall](#i-did-all-that-and-the-acid-test-still-does-not-pass--)
3. Wait until the install process is _complete_.
4. `softwareupdate -l`  # No listing is a good sign.
    * If Xcode or Tools upgrades are listed, use "Software Update" to install them.
5. `xcode-select -version`  # Should return `xcode-select version 2370` or later.
6. `xcode-select -print-path`  # Should return `/Library/Developer/CommandLineTools`
7. Try the [_acid test_ steps above](#The-acid-test) to see if your Mac is ready.
8. If the _acid test_ does _not_ pass then...
9. `sudo xcode-select --reset`  # Enter root password.  No output is normal.
10. Repeat step 5 above.  Is the path different this time?  Repeat the _acid test_.

### Installing `node-gyp` using the Xcode Command Line Tools via manual download
1. Download the appropriate version of the "Command Line Tools for Xcode" for your version of Catalina from <https://developer.apple.com/download/more/>. As of MacOS 10.15.5, that's [Command_Line_Tools_for_Xcode_11.5.dmg](https://download.developer.apple.com/Developer_Tools/Command_Line_Tools_for_Xcode_11.5/Command_Line_Tools_for_Xcode_11.5.dmg)
2. Install the package.
3. Run the [_acid test_ steps above](#The-acid-test).

### I did all that and the acid test still does not pass :-(
1. `sudo rm -rf $(xcode-select -print-path)`  # Enter root password.  No output is normal.
2. `sudo rm -rf /Library/Developer/CommandLineTools`  # Enter root password.
3. `sudo xcode-select --reset`
4. `xcode-select --install`
5. If the [_acid test_ steps above](#The-acid-test) still does _not_ pass then...
6. `npm explore npm -g -- npm install node-gyp@latest`
7. `npm explore npm -g -- npm explore npm-lifecycle -- npm install node-gyp@latest`
8. If the _acid test_ still does _not_ pass then...
9. Add a comment to https://github.com/nodejs/node-gyp/issues/1927 so we can improve.

Lessons learned from:
* https://github.com/nodejs/node-gyp/issues/1779
* https://github.com/nodejs/node-gyp/issues/1861
* https://github.com/nodejs/node-gyp/issues/1927 and elsewhere
* Thanks to @rrrix for discovering Solution 3
