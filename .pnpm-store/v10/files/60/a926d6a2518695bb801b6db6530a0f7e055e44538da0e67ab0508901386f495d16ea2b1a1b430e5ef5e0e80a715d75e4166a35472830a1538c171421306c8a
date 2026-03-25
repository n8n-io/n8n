# readlineSync
# https://github.com/anseki/readline-sync
#
# Copyright (c) 2019 anseki
# Licensed under the MIT license.

# Use perl for compatibility of sed/awk of GNU / POSIX, BSD. (and tr)
# Hide "\n" from shell by "\fNL"

decode_arg() {
  printf '%s' "$(printf '%s' "$1" | perl -pe 's/#(\d+);/sprintf("%c", $1)/ge; s/[\r\n]/\fNL/g')"
}

# getopt(s)
while [ $# -ge 1 ]; do
  arg="$(printf '%s' "$1" | grep -E '^-+[^-]+$' | tr '[A-Z]' '[a-z]' | tr -d '-')"
  case "$arg" in
    'display')          shift; options_display="$(decode_arg "$1")";;
    'displayonly')      options_displayOnly=true;;
    'keyin')            options_keyIn=true;;
    'hideechoback')     options_hideEchoBack=true;;
    'mask')             shift; options_mask="$(decode_arg "$1")";;
    'limit')            shift; options_limit="$(decode_arg "$1")";;
    'casesensitive')    options_caseSensitive=true;;
  esac
  shift
done

reset_tty() {
  if [ -n "$save_tty" ]; then
    stty --file=/dev/tty "$save_tty" 2>/dev/null || \
      stty -F /dev/tty "$save_tty" 2>/dev/null || \
      stty -f /dev/tty "$save_tty" || exit $?
  fi
}
trap 'reset_tty' EXIT
save_tty="$(stty --file=/dev/tty -g 2>/dev/null || stty -F /dev/tty -g 2>/dev/null || stty -f /dev/tty -g || exit $?)"

[ -z "$options_display" ] && [ "$options_keyIn" = true ] && \
  [ "$options_hideEchoBack" = true ] && [ -z "$options_mask" ] && silent=true
[ "$options_hideEchoBack" != true ] && [ "$options_keyIn" != true ] && is_cooked=true

write_tty() {
  # if [ "$2" = true ]; then
  #   printf '%b' "$1" >/dev/tty
  # else
  #   printf '%s' "$1" >/dev/tty
  # fi
  printf '%s' "$1" | perl -pe 's/\fNL/\r\n/g' >/dev/tty
}

replace_allchars() { (
  text=''
  for i in $(seq 1 ${#1})
  do
    text="$text$2"
  done
  printf '%s' "$text"
) }

if [ -n "$options_display" ]; then
  write_tty "$options_display"
fi
if [ "$options_displayOnly" = true ]; then
  printf "'%s'" ''
  exit 0
fi

if [ "$is_cooked" = true ]; then
  stty --file=/dev/tty cooked 2>/dev/null || \
    stty -F /dev/tty cooked 2>/dev/null || \
    stty -f /dev/tty cooked || exit $?
else
  stty --file=/dev/tty raw -echo 2>/dev/null || \
    stty -F /dev/tty raw -echo 2>/dev/null || \
    stty -f /dev/tty raw -echo || exit $?
fi

[ "$options_keyIn" = true ] && req_size=1

if [ "$options_keyIn" = true ] && [ -n "$options_limit" ]; then
  if [ "$options_caseSensitive" = true ]; then
    limit_ptn="$options_limit"
  else
    # Safe list
    # limit_ptn="$(printf '%s' "$options_limit" | sed 's/\([a-z]\)/\L\1\U\1/ig')"
    limit_ptn="$(printf '%s' "$options_limit" | perl -pe 's/([a-z])/lc($1) . uc($1)/ige')"
  fi
fi

while :
do
  if [ "$is_cooked" != true ]; then
    # chunk="$(dd if=/dev/tty bs=1 count=1 2>/dev/null)"
    chunk="$(dd if=/dev/tty bs=1 count=1 2>/dev/null | perl -pe 's/[\r\n]/\fNL/g')"
  else
    IFS= read -r chunk </dev/tty || exit $?
    chunk="$(printf '%s\fNL' "$chunk")"
  fi

  # if [ -n "$chunk" ] && [ "$(printf '%s' "$chunk" | tr '\r' '\n' | wc -l)" != "0" ]; then
  #   chunk="$(printf '%s' "$chunk" | tr '\r' '\n' | head -n 1)"
  if [ -n "$chunk" ] && printf '%s' "$chunk" | perl -ne '/\fNL/ or exit 1'; then
    chunk="$(printf '%s' "$chunk" | perl -pe 's/^(.*?)\fNL.*$/$1/')"
    at_eol=true
  fi

  # other ctrl-chars
  if [ -n "$chunk" ]; then
    # chunk="$(printf '%s' "$chunk" | tr -d '\00-\10\13\14\16-\37\177')"
    # for System V
    chunk="$(printf '%s' "$chunk" | tr -d '\00\01\02\03\04\05\06\07\10\13\14\16\17\20\21\22\23\24\25\26\27\30\31\32\33\34\35\36\37\177')"
  fi
  if [ -n "$chunk" ] && [ -n "$limit_ptn" ]; then
    chunk="$(printf '%s' "$chunk" | tr -cd "$limit_ptn")"
  fi

  if [ -n "$chunk" ]; then
    if [ "$is_cooked" != true ]; then
      if [ "$options_hideEchoBack" != true ]; then
        write_tty "$chunk"
      elif [ -n "$options_mask" ]; then
        write_tty "$(replace_allchars "$chunk" "$options_mask")"
      fi
    fi
    input="$input$chunk"
  fi

  if ( [ "$options_keyIn" != true ] && [ "$at_eol" = true ] ) || \
    ( [ "$options_keyIn" = true ] && [ ${#input} -ge $req_size ] ); then break; fi
done

if [ "$is_cooked" != true ] && [ "$silent" != true ]; then write_tty "$(printf '%b' '\fNL')"; fi

printf "'%s'" "$input"

exit 0
