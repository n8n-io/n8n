# jest-changed-files

A module used internally by Jest to check which files have changed since you last committed in git or hg.

## Install

```sh
$ npm install --save jest-changed-files
```

## API

### `getChangedFilesForRoots(roots: Array<string>, options: Options): Promise<ChangedFiles>`

Get the list of files and repos that have changed since the last commit.

#### Parameters

roots: Array of string paths gathered from [jest roots](https://jestjs.io/docs/configuration#roots-arraystring).

options: Object literal with keys

- lastCommit: boolean
- withAncestor: boolean
- changedSince: string

### Returns

A Promise of Object literal with keys

- changedFiles: Set\<string>
- repos:
  - git: Set\<string>
  - hg: Set\<string>

### findRepos(roots: Array<string>): Promise<Repos>

Get a set of git and hg repositories.

#### Parameters

roots: Array of string paths gathered from [jest roots](https://jestjs.io/docs/configuration#roots-arraystring).

### Returns

A Promise of Object literal with keys

- git: Set\<string>
- hg: Set\<string>

## Usage

```javascript
import {getChangedFilesForRoots} from 'jest-changed-files';

getChangedFilesForRoots(['/path/to/test'], {
  lastCommit: true,
  withAncestor: true,
}).then(files => {
  /*
  {
    repos: [],
    changedFiles: []
  }
  */
});
```

```javascript
import {getChangedFilesForRoots} from 'jest-changed-files';

getChangedFilesForRoots(['/path/to/test'], {
  changedSince: 'main',
}).then(files => {
  /*
  {
    repos: [],
    changedFiles: []
  }
  */
});
```

```javascript
import {findRepos} from 'jest-changed-files';

findRepos(['/path/to/test']).then(repos => {
  /*
  {
    git: Set<Path>,
    hg: Set<Path>
  }
  */
});
```
