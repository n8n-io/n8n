package util

import (
	"fmt"
	"strings"
)

// Greet returns a greeting message
func Greet(name string) string {
	return fmt.Sprintf("Hello, %s!", name)
}

// Reverse reverses a string
func Reverse(s string) string {
	runes := []rune(s)
	for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
		runes[i], runes[j] = runes[j], runes[i]
	}
	return string(runes)
}

// Contains checks if a string contains a substring
func Contains(s, substr string) bool {
	return strings.Contains(s, substr)
}
