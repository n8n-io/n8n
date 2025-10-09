pre-commit:
  commands:
    biome_check:
      glob: 'packages/**/*.{js,ts,json}'
      run: pnpm biome check --write --no-errors-on-unmatched --files-ignore-unknown=true --colors=off {staged_files}
      stage_fixed: true
      skip:
        - merge
        - rebase
    prettier_check:
      glob: 'packages/**/*.{vue,yml,md,css,scss}'
      run: pnpm prettier --write --ignore-unknown --no-error-on-unmatched-pattern {staged_files}
      stage_fixed: true
      skip:
        - merge
        - rebase
    styles_check:
      glob: 'packages/**/*.{scss,sass,vue}'
      run: pnpm lint:styles:fix
      skip:
        - merge
        - rebase
    actionlint_check:
      glob: '.github/workflows/*.{yml,yaml}'
      run: actionlint {staged_files}
      skip:
        - merge
        - rebase
