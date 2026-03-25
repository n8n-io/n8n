# Contributors

## Checkin

- Do checkin source (src)
- Do not checkin build output (dist)
- Do not checkin node_modules

## Development

In order to handle code style and static analysis, we run [Husky](https://github.com/typicode/husky) before each commit.
This step ensures that formatting and checkin rules are followed. To make sure Husky runs correctly, please use the
following workflow:

```sh
npm install                                 # installs all devDependencies including Husky
git add abc.ext                             # Add the files you've changed. This should include files in src, lib, and node_modules (see above)
git commit -m "Informative commit message"  # Commit. This will run Husky
```

During the commit step, Husky will take care of formatting all files with [Prettier](https://github.com/prettier/prettier).
It will also make sure these changes are appropriately included in your commit (no further work is needed)
