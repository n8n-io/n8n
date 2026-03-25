# readlineSync
# https://github.com/anseki/readline-sync
#
# Copyright (c) 2019 anseki
# Licensed under the MIT license.

Param(
  [string] $display,
  [switch] $displayOnly,
  [switch] $keyIn,
  [switch] $hideEchoBack,
  [string] $mask,
  [string] $limit,
  [switch] $caseSensitive
)

$ErrorActionPreference = 'Stop' # for cmdlet
trap {
  # `throw $_` and `Write-Error $_` return exit-code 0
  $Host.UI.WriteErrorLine($_)
  exit 1
}

function decodeArg ($arg) {
  [Regex]::Replace($arg, '#(\d+);', { [char][int] $args[0].Groups[1].Value })
}

$options = @{}
foreach ($arg in @('display', 'displayOnly', 'keyIn', 'hideEchoBack', 'mask', 'limit', 'caseSensitive')) {
  $options.Add($arg, (Get-Variable $arg -ValueOnly))
}
$argList = New-Object string[] $options.Keys.Count
$options.Keys.CopyTo($argList, 0)
foreach ($arg in $argList) {
  if ($options[$arg] -is [string] -and $options[$arg])
    { $options[$arg] = decodeArg $options[$arg] }
}

[string] $inputTTY = ''
[bool] $silent = -not $options.display -and
  $options.keyIn -and $options.hideEchoBack -and -not $options.mask
[bool] $isCooked = -not $options.hideEchoBack -and -not $options.keyIn

# Instant method that opens TTY without CreateFile via P/Invoke in .NET Framework
# **NOTE** Don't include special characters of DOS in $command when $getRes is True.
# [string] $cmdPath = $Env:ComSpec
# [string] $psPath = 'powershell.exe'
function execWithTTY ($command, $getRes = $False, $throwError = $False) {
  if ($getRes) {
    $res = (cmd.exe /C "<CON powershell.exe -Command $command")
    if ($LastExitCode -ne 0) {
      if ($throwError) { throw $LastExitCode }
      else { exit $LastExitCode }
    }
    return $res
  } else {
    $command | cmd.exe /C ">CON powershell.exe -Command -"
    if ($LastExitCode -ne 0) {
      if ($throwError) { throw $LastExitCode }
      else { exit $LastExitCode }
    }
  }
}

function writeTTY ($text) {
  execWithTTY ('Write-Host (''' +
    (($text -replace '''', '''''') -replace '[\r\n]', '''+"`n"+''') + ''') -NoNewline')
}

if ($options.display) {
  writeTTY $options.display
}
if ($options.displayOnly) { return "''" }

if (-not $options.keyIn -and $options.hideEchoBack -and $options.mask -eq '*') {
  # It fails when it's not ready.
  try {
    $inputTTY = execWithTTY ('$text = Read-Host -AsSecureString;' +
      '$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($text);' +
      '[Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)') $True $True
    return '''' + $inputTTY + ''''
  } catch {} # ignore
}

if ($options.keyIn) { $reqSize = 1 }

if ($options.keyIn -and $options.limit) {
  $limitPtn = '[^' + $options.limit + ']'
}

while ($True) {
  if (-not $isCooked) {
    $chunk = [char][int] (execWithTTY '[int] [Console]::ReadKey($True).KeyChar' $True)
  } else {
    $chunk = execWithTTY 'Read-Host' $True
    $chunk += "`n"
  }

  if ($chunk -and $chunk -match '^(.*?)[\r\n]') {
    $chunk = $Matches[1]
    $atEol = $True
  } else { $atEol = $False }

  # other ctrl-chars
  if ($chunk) { $chunk = $chunk -replace '[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '' }
  if ($chunk -and $limitPtn) {
    if ($options.caseSensitive)   { $chunk = $chunk -creplace $limitPtn, '' }
    else                          { $chunk = $chunk -ireplace $limitPtn, '' }
  }

  if ($chunk) {
    if (-not $isCooked) {
      if (-not $options.hideEchoBack) {
        writeTTY $chunk
      } elseif ($options.mask) {
        writeTTY ($options.mask * $chunk.Length)
      }
    }
    $inputTTY += $chunk
  }

  if ((-not $options.keyIn -and $atEol) -or
    ($options.keyIn -and $inputTTY.Length -ge $reqSize)) { break }
}

if (-not $isCooked -and -not $silent) { execWithTTY 'Write-Host ''''' } # new line

return "'$inputTTY'"
