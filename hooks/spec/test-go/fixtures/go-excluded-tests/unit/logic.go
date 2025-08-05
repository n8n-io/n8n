package unit

import "strings"

// ProcessString performs various string operations
func ProcessString(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	return s
}

// ValidateEmail checks if a string is a valid email format
func ValidateEmail(email string) bool {
	if email == "" {
		return false
	}

	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}

	if parts[0] == "" || parts[1] == "" {
		return false
	}

	return strings.Contains(parts[1], ".")
}

// CalculateScore computes a score based on inputs
func CalculateScore(base int, multiplier float64, bonus int) int {
	return int(float64(base)*multiplier) + bonus
}
